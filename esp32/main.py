# main.py

import network
import time
import ubluetooth
import ubinascii
import ujson
from machine import Pin, time_pulse_us, reset
from umqtt.simple import MQTTClient
import config

TRIG_PIN = 25
ECHO_PIN = 27

trig = Pin(TRIG_PIN, Pin.OUT)
echo = Pin(ECHO_PIN, Pin.IN)

def read_distance_cm():
    trig.value(0)
    time.sleep_us(2)
    trig.value(1)
    time.sleep_us(10)
    trig.value(0)
    try:
        duration = time_pulse_us(echo, 1, 30000)
        distance_cm = (duration / 2) / 29.1
        dis = 193-distance_cm
        return round(dis, 1)
    except OSError:
        return None

ble = ubluetooth.BLE()
ble.active(True)

mqtt = None
last_weight = None
weight_buffer = []
weight_sent = False

def connect_wifi():
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    if not wlan.isconnected():
        print("🔌 Connecting to Wi-Fi...")
        wlan.connect(config.WIFI_SSID, config.WIFI_PASSWORD)
        for _ in range(20):
            if wlan.isconnected():
                break
            time.sleep(1)
    if wlan.isconnected():
        print("✅ Wi-Fi connected, IP:", wlan.ifconfig()[0])
    else:
        print("❌ Failed to connect")
        raise RuntimeError("Wi-Fi failed")

def parse_miscale_advertisement(adv_data):
    data = bytes(adv_data)
    for i in range(len(data) - 6):
        if data[i] == 0x16 and data[i+1] == 0x1D and data[i+2] == 0x18:
            flags = data[i + 3]
            weight_raw = data[i + 4] | (data[i + 5] << 8)
            if (flags & 0x01) == 0:
                return weight_raw / 200.0
            else:
                return weight_raw / 100.0
    return None

def bt_irq(event, data):
    global last_weight, weight_buffer, weight_sent

    if event == 5:  
        addr_type, addr, adv_type, rssi, adv_data = data
        mac = ubinascii.hexlify(addr).decode().upper()

        if mac == config.TARGET_MAC:
            weight = parse_miscale_advertisement(adv_data)
            if weight and weight > 10:
                weight_buffer.append(weight)
                if len(weight_buffer) > 3:
                    weight_buffer.pop(0)

                if len(weight_buffer) == 3 and all(w == weight_buffer[0] for w in weight_buffer):
                    if weight != last_weight:
                        distance = read_distance_cm()
                        payload = ujson.dumps({
                            "weight": round(weight, 2),
                            "distance_cm": distance
                        })
                        print(f"⚖️ Weight: {weight:.2f} kg | 📏 Distance: {distance} cm")
                        mqtt.publish(config.MQTT_TOPIC, payload)
                        last_weight = weight
                        weight_sent = True
                        ble.gap_scan(None)
                        print("✅ Data sent. Rebooting...")
                        time.sleep(1)
                        reset()

def start_scan():
    global weight_buffer
    weight_buffer = []
    print("🔍 Scanning for weight...")
    ble.irq(bt_irq)
    ble.gap_scan(10000, 30000, 30000)

def mqtt_callback(topic, msg):
    print(f"📥 Received on {topic}: {msg}")
    if msg == b"scan":
        start_scan()

def connect_mqtt():
    global mqtt
    mqtt = MQTTClient(
        config.MQTT_CLIENT_ID,
        config.MQTT_BROKER,
        port=config.MQTT_PORT,
        ssl=config.MQTT_USE_TLS,
        ssl_params={"cert_reqs": 0} if config.MQTT_SKIP_CERT_VERIFY else {}
    )
    mqtt.set_callback(mqtt_callback)
    mqtt.connect()
    mqtt.subscribe(b"scale/control")
    print("📡 Subscribed to scale/control")

def main():
    connect_wifi()
    connect_mqtt()
    print("📬 Waiting for MQTT command...")
    while not weight_sent:
        mqtt.wait_msg()

main()


