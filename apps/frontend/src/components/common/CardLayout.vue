<template>
  <div class="card-layout">
    <el-card>
      <template v-if="title || $slots.header" #header>
        <div class="card-header">
          <span v-if="title" class="card-title">{{ title }}</span>
          <slot v-else name="header"></slot>
          <div v-if="$slots.actions" class="card-actions">
            <slot name="actions"></slot>
          </div>
        </div>
      </template>
      <div class="card-content">
        <slot></slot>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
interface Props {
  title?: string
}

defineProps<Props>()
</script>

<style scoped>
.card-layout {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.card-layout :deep(.el-card) {
  border: none;
  box-shadow: none;
}

.card-layout :deep(.el-card__body) {
  padding: 0;
}

.card-layout :deep(.el-card__header) {
  border-bottom: none;
  padding: 20px 20px 0 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title {
  font-weight: 600;
  color: #333;
  font-size: 1.1rem;
}

.card-actions {
  display: flex;
  gap: 0.5rem;
}

.card-content {
  padding: 0 12px;
}
</style>
