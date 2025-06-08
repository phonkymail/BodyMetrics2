<template>
  <div class="min-h-screen bg-cover bg-center font-sans relative"
       style="background-image: url('/webpage/pics/4.jpg')">

    <div class="absolute inset-0 bg-black/60"></div>

    <div class="relative z-10 flex items-center justify-center h-full px-4">
      <div class="bg-amber-50 bg-opacity-90 text-black max-w-xl w-full p-6 rounded-xl shadow-lg text-center space-y-4">

        <img
          src="/webpage/pics/5.png"
          alt="Projektbillede"
          class="w-32 h-32 object-contain mx-auto mb-2"
        />

        <h1 class="text-2xl font-bold">ℹ️ Om BodyMetrics</h1>

        <p class="text-base">
          BodyMetrics er et IoMT eksamensprojekt udviklet af KEA IT-Teknolog studerende. Projektet fokuserer på børns vækstovervågning med diskret og sikker databehandling.
        </p>

        <hr class="my-4 border-t border-gray-400 opacity-50" />

        <p class="text-base font-semibold">DaRaPh@2025</p>

        <NuxtLink to="/">
          <button class="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-full shadow transition">
            ⬅️ Tilbage til forsiden
          </button>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
