<template>
  <div class="chart-container">
    <Line :data="chartData" :options="chartOptions" />
  </div>
</template>

<script setup lang="ts">
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement
} from 'chart.js'
import { Line } from 'vue-chartjs'
import { computed, defineProps } from 'vue'

ChartJS.register(Title, Tooltip, Legend, LineElement, CategoryScale, LinearScale, PointElement)

const props = defineProps({
  measurements: {
    type: Array,
    required: true
  },
  showReference: {
    type: Boolean,
    default: true
  },
  birthDate: {
    type: String,
    required: true
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true
    },
    title: {
      display: true,
      text: 'BMI over tid'
    }
  },
  scales: {
    y: {
      title: {
        display: true,
        text: 'BMI (kg/m²)'
      },
      beginAtZero: false
    },
    x: {
      title: {
        display: true,
        text: 'Alder'
      }
    }
  }
}

// WHO og Asiatisk reference-BMI
const referenceAges = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]
const bmiWHO = [15.2, 15.5, 15.8, 16.2, 16.8, 17.5, 18.2, 19.0, 19.8, 20.5, 21.2]
const bmiAsia = [14.6, 14.8, 15.0, 15.3, 15.7, 16.2, 16.8, 17.3, 17.9, 18.4, 19.0]

const calculateAge = (birthDate: string, timestamp: string): number => {
  const birth = new Date(birthDate)
  const measureDate = new Date(timestamp)
  let age = measureDate.getFullYear() - birth.getFullYear()
  const m = measureDate.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && measureDate.getDate() < birth.getDate())) {
    age--
  }
  return age
}

const chartData = computed(() => {
  const labels: number[] = []
  const bmiData: number[] = []
  const datasets: any[] = []

  props.measurements.forEach(m => {
    const age = calculateAge(props.birthDate, m.timestamp)
    labels.push(age)
    const bmi = m.weight / Math.pow(m.height / 100, 2)
    bmiData.push(parseFloat(bmi.toFixed(1)))
  })

  datasets.push({
    label: 'Barnets BMI',
    data: bmiData,
    fill: false,
    borderColor: 'black',
    tension: 0.1
  })

  if (props.showReference) {
    datasets.push({
      label: 'WHO BMI (Vestlig)',
      data: bmiWHO,
      borderColor: 'blue',
      fill: false,
      borderDash: [5, 5],
      tension: 0.3
    })
    datasets.push({
      label: 'Asiatisk BMI',
      data: bmiAsia,
      borderColor: 'red',
      fill: false,
      borderDash: [5, 5],
      tension: 0.3
    })
  }

  return {
    labels,
    datasets
  }
})
</script>

<style scoped>
.chart-container {
  width: 100%;
  max-width: 700px;
  height: 300px;
  margin: 0 auto;
}

@media (max-width: 640px) {
  .chart-container {
    height: 220px;
  }
}
</style>
