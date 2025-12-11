import { ref } from 'vue'
import { Language } from '@/utils/helpers'

const currentLanguage = ref<Language>(Language.KM) // Default to Khmer

export const useLanguage = () => {
  const setLanguage = (lang: Language) => {
    currentLanguage.value = lang
    // Update HTML lang attribute
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang.toLowerCase()
      document.body.setAttribute('data-lang', lang.toLowerCase())
    }
    // Store in localStorage for persistence
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('app_language', lang)
    }
  }

  const getLanguage = (): Language => {
    return currentLanguage.value
  }

  const initializeLanguage = () => {
    if (typeof localStorage === 'undefined' || typeof document === 'undefined') {
      return
    }
    
    // Try to get language from localStorage
    const storedLang = localStorage.getItem('app_language') as Language
    if (storedLang && Object.values(Language).includes(storedLang)) {
      setLanguage(storedLang)
    } else {
      // Default to Khmer
      setLanguage(Language.KM)
    }
  }

  return {
    currentLanguage,
    setLanguage,
    getLanguage,
    initializeLanguage,
  }
}

