import bluetooth
import time
from micropython import const
from ubinascii import hexlify
import network
from time import sleep
import machine
import ujson
from umqtt.simple import MQTTClient

# BLE IRQ constants
_IRQ_SCAN_RESULT = const(5)
_IRQ_SCAN_DONE = const(6)
_IRQ_PERIPHERAL_CONNECT = const(7)
_IRQ_PERIPHERAL_DISCONNECT = const(8)
_IRQ_GATTC_SERVICE_RESULT = const(9)
_IRQ_GATTC_SERVICE_DONE = const(10)
_IRQ_GATTC_CHARACTERISTIC_RESULT = const(11)
_IRQ_GATTC_CHARACTERISTIC_DONE = const(12)
_IRQ_GATTC_NOTIFY = const(18)

# BLE setup
TARGET_MAC = b'\x6C\xEC\xEB\x3C\x10\x0F'
ble = bluetooth.BLE()
ble.active(True)

# MQTT settings
MQTT_BROKER = "4.246.143.71"
MQTT_PORT = 1883
MQTT_TOPIC = b"measurment"
MQTT_CLIENT_ID = b"esp32-iot4"

# Distance sensor
class DistanceSensor:
    def __init__(self, trigger_pin, echo_pin):
        self.trigger = machine.Pin(trigger_pin, machine.Pin.OUT)
        self.echo = machine.Pin(echo_pin, machine.Pin.IN)
        self.trigger.value(0)

    def measure_distance(self):
        self.trigger.value(1)
        time.sleep_us(10)
        self.trigger.value(0)

        while self.echo.value() == 0:
            pass
        start_time = time.ticks_us()

        while self.echo.value() == 1:
            pass
        stop_time = time.ticks_us()

        elapsed_time = time.ticks_diff(stop_time, start_time)
        return (elapsed_time * 0.0343) / 2

def average_filtered_distance(sensor, num=20):
    values = []
    for _ in range(num):
        try:
            dist = sensor.measure_distance()
            values.append(dist)
            time.sleep(0.03)
        except:
            pass
    if len(values) < 5:
        raise Exception("Too few valid measurements.")
    values.sort()
    filtered = values[2:-2]
    return sum(filtered) / len(filtered)

# Init sensor
sensor = DistanceSensor(trigger_pin=27, echo_pin=25)

# Wi-Fi
def connect_wifi():
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    if not wlan.isconnected():
        print("Connecting to Wi-Fi...")
        wlan.connect("ASUSm2", "rafal1978")
        while not wlan.isconnected():
            time.sleep(1)
    print("Wi-Fi connected, IP:", wlan.ifconfig()[0])

# MQTT
def connect_mqtt():
    global mqtt
    print("connecting to mqtt broker")
    mqtt = MQTTClient(MQTT_CLIENT_ID, MQTT_BROKER, MQTT_PORT)
    mqtt.connect()
    print("Connected to MQTT broker")

# BLE state
conn_handle = None
services_to_check = []
current_service_index = 0
notification_subscribed = False
connected = False

# Weight decode
def decode_weight(data):
    if len(data) >= 6:
        raw = int.from_bytes(data[4:6], "big")
        return raw / 10.0
    return 0.0

def restart_scan():
    global services_to_check, current_service_index, conn_handle, connected, notification_subscribed
    services_to_check = []
    current_service_index = 0
    conn_handle = None
    connected = False
    notification_subscribed = False
    print("Restarting scan in 2s...")
    time.sleep(2)
    try:
        ble.gap_scan(20000)
    except OSError as e:
        print("Scan error:", e)

# IRQ Handler
def bt_irq(event, data):
    global conn_handle, services_to_check, current_service_index, connected, notification_subscribed

    if event == _IRQ_SCAN_RESULT:
        addr_type, addr, adv_type, rssi, adv_data = data
        print("BLE found:", hexlify(addr), "RSSI:", rssi)
        if addr == TARGET_MAC and not connected:
            print("Found scale:", hexlify(addr))
            ble.gap_connect(addr_type, addr)

    elif event == _IRQ_SCAN_DONE:
        print("Scan complete")

    elif event == _IRQ_PERIPHERAL_CONNECT:
        conn_handle, _, _ = data
        connected = True
        print("Connected to scale")
        ble.gattc_discover_services(conn_handle)

    elif event == _IRQ_PERIPHERAL_DISCONNECT:
        print("Scale disconnected")
        restart_scan()

    elif event == _IRQ_GATTC_SERVICE_RESULT:
        _, start_handle, end_handle, uuid = data
        services_to_check.append((start_handle, end_handle))

    elif event == _IRQ_GATTC_SERVICE_DONE:
        if services_to_check:
            current_service_index = 0
            start, end = services_to_check[current_service_index]
            ble.gattc_discover_characteristics(conn_handle, start, end)

    elif event == _IRQ_GATTC_CHARACTERISTIC_RESULT:
        _, def_handle, value_handle, properties, uuid = data
        if properties & 0x10:  # Notify property
            if not notification_subscribed:
                for _ in range(3):
                    try:
                        time.sleep_ms(200)
                        ble.gattc_write(conn_handle, value_handle + 1, b'\x01\x00', 1)
                        notification_subscribed = True
                        print(f"Notification enabled (handle={value_handle})")
                        break
                    except OSError as e:
                        print("Notification error:", e)
                        time.sleep_ms(500)

    elif event == _IRQ_GATTC_CHARACTERISTIC_DONE:
        current_service_index += 1
        if current_service_index < len(services_to_check):
            start, end = services_to_check[current_service_index]
            ble.gattc_discover_characteristics(conn_handle, start, end)

    elif event == _IRQ_GATTC_NOTIFY:
        _, value_handle, notify_data = data
        weight = decode_weight(notify_data)
        print("Weight:", weight, "kg")

        try:
            distance = average_filtered_distance(sensor)
            print("Height:", round(distance, 2), "cm")
            payload = ujson.dumps({
                "weight": round(weight, 2),
                "height": round(distance, 2)
            })
            mqtt.publish(MQTT_TOPIC, payload)
        except Exception as e:
            print("Distance error:", e)

# Start sequence
connect_wifi()

print("Initializing BLE...")
ble.irq(bt_irq)
ble.gap_scan(20000)  
time.sleep(1)  

connect_mqtt()

# Main loop
while True:
    time.sleep(1)

 
