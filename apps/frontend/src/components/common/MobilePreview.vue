<template>
  <div class="relative w-[332.07px] max-w-full">
    <div
      class="relative h-[651.49px] w-[322.07px] rounded-[34px] overflow-hidden p-[30px] bg-white-100"
    >
      <img :src="bg" alt="" class="absolute inset-0 h-full w-full object-top" />
      <section
        class="absolute bottom-[0px] left-[2px] bottom-[2px] w-[319.00px] h-[521.19px] justify-center items-center bg-white/97 backdrop-blur-[3.01882px] border ring-1 ring-black/5 rounded-t-[18.1129px] rounded-b-[39.2447px] shadow-[0_12px_40px_rgba(0,0,0,0.25)] overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        <!-- Header with Create Notification button and user avatar -->
        <div class="absolute top-[12px] left-[12px] right-[12px] flex items-center gap-2 z-20">
          <button
            class="create-notification-preview-btn flex items-center gap-2 px-4 py-2 bg-[#0f4aea] text-white rounded-full text-sm font-medium"
            disabled
            style="pointer-events: none; cursor: default;"
          >
            Create Notification
            <div class="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
              <span class="text-white text-xs leading-none">+</span>
            </div>
          </button>
          <div
            class="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center bg-[#f0f0f0] flex-shrink-0"
          >
            <img
              v-if="userAvatar && !avatarLoadError"
              :src="userAvatar"
              alt="User Avatar"
              class="w-full h-full object-cover rounded-full"
              @error="handleAvatarError"
            />
            <div v-else class="w-full h-full flex items-center justify-center bg-[#f0f0f0]">
              <svg
                class="w-6 h-6 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
          </div>
        </div>
        <div
          class="image-container absolute top-[60px] h-[159.5px] rounded-t-[18.1129px]"
          :class="props.image ? 'bg-transparent' : 'bg-[#E2E2E2]'"
          style="left: -1px; right: -1px; width: calc(100% + 5px)"
        >
          <div
            class="absolute left-1/2 -translate-x-1/2 top-[5px] w-[46px] h-[6px] rounded-full bg-gray-400 z-10"
          ></div>
          <img
            v-if="props.image"
            :src="displayImage"
            alt=""
            class="absolute inset-0 rounded-t-[18.1129px]"
            style="width: 100%; height: 100%; object-fit: cover"
          />
          <div v-else class="grid place-items-center h-full w-full">
            <img :src="displayImage" alt="" class="w-full h-full object-contain" />
          </div>
          <div class="absolute bottom-0 inset-x-0 h-[1px] bg-black/10 z-10"></div>
        </div>
        <div
          class="scrollable-content absolute left-[12.08px] top-[231.57px] bottom-[61px] w-[307.92px] flex flex-col items-start gap-[6.04px] px-[30px] pt-[30px] pb-[20px] overflow-y-auto overflow-x-hidden"
        >
          <div 
            class="title-container"
            :class="{ 'lang-khmer': props.titleHasKhmer }"
            :data-content-lang="props.titleHasKhmer ? 'km' : ''"
          >
            {{ displayTitle || 'No title' }}
          </div>
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
          <div class="text-[14px] leading-[18px] text-black h-[18px] flex items-center pb-2">
            {{ currentDate }}
          </div>
          <div 
            v-if="displayDescription" 
            class="description-container-relative"
            :class="{ 'lang-khmer': props.descriptionHasKhmer }"
            :data-content-lang="props.descriptionHasKhmer ? 'km' : ''"
          >
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
import { computed, ref } from 'vue'
import bgImage from '@/assets/image/Home-Defualt.png'
import headerImg from '@/assets/image/empty-image.svg'
import { formatCategoryType } from '@/utils/helpers'
import { useAuthStore } from '@/stores/auth'

const bg = bgImage
const authStore = useAuthStore()

const userAvatar = computed(() => authStore.userAvatar || authStore.user?.image || '')
const avatarLoadError = ref(false)

const handleAvatarError = () => {
  avatarLoadError.value = true
}

interface Props {
  title?: string
  description?: string
  image?: string
  type?: string
  categoryType?: string
  titleHasKhmer?: boolean
  descriptionHasKhmer?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  description: '',
  image: '',
  categoryType: '',
  titleHasKhmer: false,
  descriptionHasKhmer: false,
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
  overflow-wrap: break-word;
  word-break: keep-all;
  white-space: normal;
  margin-top: 2px;
  padding-bottom: 20px;
}

.description-placeholder-relative {
  width: 290.92px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 2px;
  padding-bottom: 20px;
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

.scrollable-content {
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
}

.scrollable-content::-webkit-scrollbar {
  display: none; /* Chrome, Safari, Opera */
}

/* Ensure image container spans full width of section */
.image-container {
  left: 0 !important;
  right: 0 !important;
  width: 100% !important;
  margin: 0 !important;
  padding: 0 !important;
}

/* Ensure image fills container completely - full width, no gaps */
.image-container img {
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
  width: 100% !important;
  min-width: 100% !important;
  max-width: 100% !important;
  height: 100% !important;
  object-fit: cover !important;
  display: block !important;
  margin: 0 !important;
  padding: 0 !important;
}
</style>
