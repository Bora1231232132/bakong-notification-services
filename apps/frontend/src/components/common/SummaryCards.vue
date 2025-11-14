<template>
  <div class="summary-cards">
    <div v-for="card in cards" :key="card.title" :class="['summary-card', card.type]">
      <div class="card-content">
        <h3>{{ card.title }}</h3>
        <div class="card-number">{{ card.value }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface SummaryCard {
  title: string
  value: string | number
  type: 'schedule' | 'sending' | 'default'
}

interface Props {
  cards: SummaryCard[]
}

defineProps<Props>()
</script>

<style scoped>
.summary-cards {
  margin-bottom: 18px;
  display: flex;
  height: 80px;
}

.summary-card {
  background: #fff;
  border-radius: 8px;
  padding-left: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;
  display: flex;
  align-items: center;
}

.summary-card:hover {
  transform: translateY(-2px);
}

.summary-card.schedule {
  background: linear-gradient(135deg, #e8f5e8 0%, #f0fdf4 100%);
  border-left: 4px solid #22c55e;
  margin-right: 30px;
}

.summary-card.sending {
  background: linear-gradient(135deg, #e3f2fd 0%, #f0f9ff 100%);
  border-left: 4px solid #3b82f6;
}

.summary-card.default {
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  border-left: 4px solid #6c757d;
  margin-right: 30px;
}

.card-content h3 {
  margin: 0 0 0.5rem 0;
  color: #666;
  font-size: 14px;
  font-weight: 500;
  width: 212px;
}

.card-number {
  font-size: 24px;
  font-weight: 700;
  color: #333;
}

@media (max-width: 768px) {
  .summary-cards {
    display: flex;
    flex-direction: row;
  }
}
</style>
