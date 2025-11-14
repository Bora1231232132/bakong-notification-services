<template>
  <div class="relative w-[332.07px] max-w-full">
    <div
      class="relative h-[651.49px] w-[322.07px] rounded-[34px] overflow-hidden p-[30px] bg-white-100"
    >
      <img :src="bg" alt="" class="absolute inset-0 h-full w-full object-top" />
      <section
        class="absolute bottom-[0px] left-[2px] bottom-[2px] w-[318.90px] h-[425.90px] justify-center items-center bg-white/90 backdrop-blur-[3.01882px] border ring-1 ring-black/5 rounded-t-[18.1129px] rounded-b-[39.2447px] shadow-[0_12px_40px_rgba(0,0,0,0.25)] overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        <div
          class="absolute inset-x-0 top-0 h-[164.53px] bg-[#E2E2E2] rounded-t-[18.1129px] overflow-hidden"
        >
          <div
            class="absolute left-1/2 -translate-x-1/2 top-[10px] w-[46px] h-[6px] rounded-full bg-white/85"
          ></div>
          <div class="grid place-items-center h-full">
            <img :src="displayImage" alt="" class="w-full h-full object-cover" />
          </div>
          <div class="absolute bottom-0 inset-x-0 h-[1px] bg-black/10"></div>
        </div>
        <div
          class="absolute left-[12.08px] top-[176.6px] bottom-[60px] w-[307.92px] flex flex-col items-start gap-[6.04px] px-[30px] pt-[30px] pb-0 relative"
        >
          <div class="flex items-center w-full gap-2 h-[18px]">
            <img src="@/assets/image/star.png" alt="star" class="w-[14px] h-[14px]" />
            <div
              v-if="displayCategory"
              class="text-[12px] leading-[18px] text-black flex items-center overflow-hidden"
            >
              {{ formatCategoryType(displayCategory) }}
            </div>
            <div v-else class="w-[60%] h-[1px] border-b border-dotted border-black"></div>
          </div>
          <div class="title-container">
            {{ displayTitle || 'No title' }}
          </div>
          <div class="text-[14px] leading-[18px] text-black h-[18px] flex items-center pb-2">
            {{ currentDate }}
          </div>
          <div v-if="displayDescription" class="description-container-relative">
            <div v-html="displayDescription"></div>
          </div>
          <div v-else class="description-placeholder-relative">
            <div class="border-b border-dotted border-black h-[12px]"></div>
            <div class="border-b border-dotted border-black h-[12px]"></div>
            <div class="border-b border-dotted border-black h-[12px]"></div>
            <div class="border-b border-dotted border-black h-[12px]"></div>
          </div>
        </div>
        <div class="absolute left-[5px] right-0 bottom-[10px] h-[51.15px] px-[10.08px]">
          <div
            class="rounded-[12.08px] p-[12.08px] bg-[#DB1A1A] text-white font-semibold text-[16px] text-center select-none flex items-center justify-center"
            style="
              width: 307.92px;
              height: 42.15px;
              pointer-events: none;
              cursor: default;
              user-select: none;
            "
          >
            Close
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import bg from '@/assets/image/Home-Defualt.png'
import headerImg from '@/assets/image/empty-image.svg'
import { CategoryType, formatCategoryType } from '@/utils/helpers'

interface Props {
  title?: string
  description?: string
  image?: string
  type?: string
  categoryType?: CategoryType
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  description: '',
  image: '',
  categoryType: CategoryType.PRODUCT_AND_FEATURE as CategoryType,
})

const displayImage = computed(() => {
  return props.image || headerImg
})

const displayTitle = computed(() => {
  const title = props.title || ''
  const cleanTitle = title.replace(/<[^>]*>/g, '').trim()
  return cleanTitle
})

const displayCategory = computed(() => {
  return formatCategoryType(props.categoryType) || ''
})

const displayDescription = computed(() => {
  const description = props.description || ''
  const cleanDescription = description.trim()
  return cleanDescription
})

const currentDate = computed(() => {
  const now = new Date()
  const month = now.toLocaleDateString('en-US', { month: 'short' })
  const day = now.getDate()
  const year = now.getFullYear()
  return `${month} ${day}, ${year}`
})
</script>

<style scoped>
.title-container {
  width: 85%;
  font-size: 14px;
  font-weight: 600;
  line-height: 18px;
  color: #000000;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  text-overflow: ellipsis;
  overflow-wrap: break-word;
  word-break: keep-all;
  white-space: normal;
  max-height: 36px;
  min-height: 18px;
}

.description-container-relative {
  width: 290.92px;
  font-size: 12px;
  line-height: 16px;
  color: #020202;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  line-clamp: 4;
  -webkit-box-orient: vertical;
  text-overflow: ellipsis;
  overflow-wrap: break-word;
  word-break: keep-all;
  white-space: normal;
  max-height: 64px;
  margin-top: 2px;
}

.description-placeholder-relative {
  width: 290.92px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 2px;
}

.description-container {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  width: 290.92px;
  font-size: 12px;
  line-height: 16px;
  color: #000000;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  line-clamp: 4;
  -webkit-box-orient: vertical;
  text-overflow: ellipsis;
  overflow-wrap: break-word;
  word-break: keep-all;
  white-space: normal;
  max-height: 64px;
}

.description-placeholder {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  width: 290.92px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.line-clamp-4 {
  display: -webkit-box;
  -webkit-line-clamp: 4;
  line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
