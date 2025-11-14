<template>
  <div class="content-header">
    <Breadcrumb />
    <h1>{{ title }}</h1>
  </div>
</template>

<script setup lang="ts">
import Breadcrumb from './Breadcrumb.vue'

interface Props {
  title: string
}

defineProps<Props>()
</script>

<style scoped>
.content-header h1 {
  margin: 14px 0px;
  color: #333;
  font-size: 1.8rem;
  font-weight: 600;
}
</style>
