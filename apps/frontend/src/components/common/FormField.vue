<template>
  <el-form-item :prop="prop" :label="label" :required="required">
    <el-input
      v-if="type === 'input'"
      :model-value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :readonly="readonly"
      :clearable="clearable"
      :show-password="showPassword"
      :prefix-icon="prefixIcon"
      :suffix-icon="suffixIcon"
      :maxlength="maxlength"
      :show-word-limit="showWordLimit"
      @input="handleInput"
      @change="handleChange"
      @blur="handleBlur"
      @focus="handleFocus"
      @update:model-value="$emit('update:modelValue', $event)"
    >
      <template v-if="$slots.prefix" #prefix>
        <slot name="prefix" />
      </template>
      <template v-if="$slots.suffix" #suffix>
        <slot name="suffix" />
      </template>
    </el-input>
    <el-input
      v-else-if="type === 'textarea'"
      :model-value="modelValue"
      type="textarea"
      :placeholder="placeholder"
      :disabled="disabled"
      :readonly="readonly"
      :clearable="clearable"
      :rows="rows"
      :maxlength="maxlength"
      :show-word-limit="showWordLimit"
      @input="handleInput"
      @change="handleChange"
      @blur="handleBlur"
      @focus="handleFocus"
      @update:model-value="$emit('update:modelValue', $event)"
    />
    <el-select
      v-else-if="type === 'select'"
      :model-value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :clearable="clearable"
      :multiple="multiple"
      :filterable="filterable"
      :allow-create="allowCreate"
      @change="handleChange"
      @blur="handleBlur"
      @focus="handleFocus"
      @update:model-value="$emit('update:modelValue', $event)"
    >
      <el-option
        v-for="option in options"
        :key="option.value"
        :label="option.label"
        :value="option.value"
        :disabled="option.disabled"
      />
    </el-select>
    <el-date-picker
      v-else-if="type === 'date'"
      :model-value="modelValue"
      :type="dateType"
      :placeholder="placeholder"
      :disabled="disabled"
      :clearable="clearable"
      :format="dateFormat"
      :value-format="valueFormat"
      @change="handleChange"
      @blur="handleBlur"
      @focus="handleFocus"
      @update:model-value="$emit('update:modelValue', $event)"
    />
    <el-switch
      v-else-if="type === 'switch'"
      :model-value="modelValue"
      :disabled="disabled"
      :active-text="activeText"
      :inactive-text="inactiveText"
      @change="handleChange"
      @update:model-value="$emit('update:modelValue', $event)"
    />
    <el-radio-group
      v-else-if="type === 'radio'"
      :model-value="modelValue"
      :disabled="disabled"
      @change="handleChange"
      @update:model-value="$emit('update:modelValue', $event)"
    >
      <el-radio
        v-for="option in options"
        :key="option.value"
        :label="option.value"
        :disabled="option.disabled"
      >
        {{ option.label }}
      </el-radio>
    </el-radio-group>
    <el-checkbox-group
      v-else-if="type === 'checkbox'"
      :model-value="modelValue"
      :disabled="disabled"
      @change="handleChange"
      @update:model-value="$emit('update:modelValue', $event)"
    >
      <el-checkbox
        v-for="option in options"
        :key="option.value"
        :label="option.value"
        :disabled="option.disabled"
      >
        {{ option.label }}
      </el-checkbox>
    </el-checkbox-group>
    <slot v-else-if="type === 'custom'" :value="modelValue" :update="updateValue" />
  </el-form-item>
</template>

<script setup lang="ts">
export interface FormFieldOption {
  label: string
  value: any
  disabled?: boolean
}

interface Props {
  modelValue: any
  type?: 'input' | 'textarea' | 'select' | 'date' | 'switch' | 'radio' | 'checkbox' | 'custom'
  prop?: string
  label?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  readonly?: boolean
  clearable?: boolean
  showPassword?: boolean
  prefixIcon?: string
  suffixIcon?: string
  maxlength?: number
  showWordLimit?: boolean
  rows?: number
  options?: FormFieldOption[]
  multiple?: boolean
  filterable?: boolean
  allowCreate?: boolean
  dateType?: 'date' | 'datetime' | 'daterange' | 'datetimerange'
  dateFormat?: string
  valueFormat?: string
  activeText?: string
  inactiveText?: string
}

const props = withDefaults(defineProps<Props>(), {
  type: 'input',
  required: false,
  disabled: false,
  readonly: false,
  clearable: true,
  showPassword: false,
  showWordLimit: false,
  rows: 3,
  multiple: false,
  filterable: false,
  allowCreate: false,
  dateType: 'date',
  dateFormat: 'YYYY-MM-DD',
  valueFormat: 'YYYY-MM-DD',
})

const emit = defineEmits<{
  'update:modelValue': [value: any]
  input: [value: any]
  change: [value: any]
  blur: [event: Event]
  focus: [event: Event]
}>()

const updateValue = (value: any) => {
  emit('update:modelValue', value)
}

const handleInput = (value: any) => {
  emit('input', value)
}

const handleChange = (value: any) => {
  emit('change', value)
}

const handleBlur = (event: Event) => {
  emit('blur', event)
}

const handleFocus = (event: Event) => {
  emit('focus', event)
}
</script>

<style scoped>
.el-form-item {
  margin-bottom: 18px;
}

.el-form-item:last-child {
  margin-bottom: 0;
}
</style>
