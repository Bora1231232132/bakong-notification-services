<template>
  <div class="tabs-container">
    <div
      v-for="tab in tabs"
      :key="tab.value"
      class="tab"
      :class="{ active: activeTab === tab.value }"
      @click="handleTabChange(tab.value)"
    >
      {{ tab.label }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Tab {
  value: string
  label: string
}

interface Props {
  tabs: Tab[]
  modelValue: string
}

interface Emits {
  (e: 'update:modelValue', value: string): void
  (e: 'tab-changed', tab: Tab): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const activeTab = computed({
  get: () => props.modelValue,
  set: (value: string) => emit('update:modelValue', value),
})

const handleTabChange = (tabValue: string) => {
  activeTab.value = tabValue
  const selectedTab = props.tabs.find((tab) => tab.value === tabValue)
  if (selectedTab) {
    emit('tab-changed', selectedTab)
  }
}
</script>

<style scoped>
.tabs-container {
  display: flex;
  flex-direction: row;
  justify-content: left;
  align-items: center;
  gap: 8px;
}

.tab {
  box-sizing: border-box;
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  padding: 8px 16px;
  gap: 8px;
  height: 32px;
  border-radius: 32px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 400;
  transition: all 0.2s ease;
  flex: none;
  order: 0;
  flex-grow: 0;
  border: 1px solid rgba(0, 19, 70, 0.05);
  background: white;
  color: #001346;
}

.tab:hover {
  border-color: rgba(0, 19, 70, 0.1);
}

.tab.active {
  background: #001346;
  color: white;
  border: none;
}
</style>
