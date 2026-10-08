<template>
  <component
    :is="componentMap[interactionType]"
    v-if="componentMap[interactionType]"
    :payload="payload"
    :loading="loading"
    @submit="$emit('submit', $event)"
    @reject="$emit('reject', $event)"
  />
  <!-- fallback: 未知类型走 confirm -->
  <ConfirmInteraction
    v-else
    :payload="payload"
    :loading="loading"
    @submit="$emit('submit', $event)"
    @reject="$emit('reject', $event)"
  />
</template>

<script setup lang="ts">
import { computed, type Component } from "vue";
import type { InteractionPayload, InteractionType } from "./types";
import ConfirmInteraction from "./ConfirmInteraction.vue";
import PlanEditInteraction from "./PlanEditInteraction.vue";
import CompareInteraction from "./CompareInteraction.vue";
import StepFormInteraction from "./StepFormInteraction.vue";
import LegacyInteraction from "./LegacyInteraction.vue";

const props = defineProps<{
  payload?: InteractionPayload | null;
  loading?: boolean;
}>();

defineEmits<{
  submit: [result: { confirmed: boolean; input: Record<string, any>; reason?: string }];
  reject: [result: { confirmed: boolean; input: Record<string, any>; reason?: string }];
}>();

const interactionType = computed<InteractionType>(() => {
  const t = props.payload?.type;
  // 自动识别：有 preview 字段的 confirm 升级为 impact_preview
  if (t === "confirm" && props.payload?.preview?.rows?.length) return "impact_preview";
  // 自动识别：有 plan 字段的升级为 plan_edit
  if (t === "confirm" && props.payload?.plan?.steps?.length) return "plan_edit";
  // 自动识别：有 compare 字段的升级为 compare
  if ((t === "choice" || t === "confirm") && props.payload?.compare?.options?.length) return "compare";
  // 自动识别：有 steps 字段的升级为 step_form
  if (t === "form" && props.payload?.steps?.length) return "step_form";
  return (t || "confirm") as InteractionType;
});

const componentMap: Record<string, Component> = {
  confirm: ConfirmInteraction,
  impact_preview: ConfirmInteraction,
  plan_edit: PlanEditInteraction,
  compare: CompareInteraction,
  step_form: StepFormInteraction,
  choice: LegacyInteraction,
  form: LegacyInteraction,
  feedback: LegacyInteraction,
  input: LegacyInteraction,
  clarify: LegacyInteraction,
};
</script>
