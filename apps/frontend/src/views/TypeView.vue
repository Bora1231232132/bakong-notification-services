<template>
  <div class="w-full p-4 md:p-6 lg:p-8">
    <div class="max-w-7xl mx-auto flex flex-col min-h-[350px]">
      <div class="h-auto sm:h-[56px] flex-shrink-0">
        <NotificationTableHeader @addNew="addNew" @filter="filter" />
      </div>
      <div class="h-2"></div>
      <div class="flex-1 min-h-0 overflow-hidden">
        <NotificationTableBody
          :notifications="notifications"
          @view="viewItem"
          @edit="editItem"
          @delete="deleteItem"
        />
      </div>
      <div class="h-2"></div>
      <div class="h-auto sm:h-[56px] flex-shrink-0">
        <NotificationPagination :page="page" @next="nextPage" @prev="prevPage" @goto="goToPage" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import NotificationTableHeader from '@/components/common/Type-Feature/NotificationTableHeader.vue'
import NotificationTableBody from '@/components/common/Type-Feature/NotificationTableBody.vue'
import NotificationPagination from '@/components/common/Type-Feature/NotificationPagination.vue'

const router = useRouter()

const page = ref(1)
const notifications = ref([
  { icon: '📰', name: 'News' },
  { icon: '🎉', name: 'Event' },
  { icon: '💻', name: 'Product and Feature' },
  { icon: '🔔', name: 'Other' },
])

const nextPage = () => page.value++
const prevPage = () => {
  if (page.value > 1) page.value--
}
const goToPage = (num: number) => (page.value = Number(num))

const addNew = () => {
  console.log('Add new button clicked, navigating to /templates/create')
  router.push('/templates/create')
}
const filter = () => alert('Filter clicked!')
const viewItem = (item: any) => alert('View ' + item.name)
const editItem = (item: any) => alert('Edit ' + item.name)
const deleteItem = (item: any) => alert('Delete ' + item.name)
</script>
