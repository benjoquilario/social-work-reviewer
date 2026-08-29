import { memo } from "react"

import {
  DIFFICULTY_FILTER_LABELS,
  FEEDBACK_TIMING_LABELS,
  isAutoAdvanceApplicable,
  QUESTION_SOURCE_LABELS,
  TIMER_MODE_LABELS,
  type DifficultyFilter,
  type FeedbackTiming,
  type MemberSettings,
  type QuestionSource,
  type TimerMode,
} from "@/lib/member/settings"
import {
  SettingsOptionRow,
  SettingsStepperRow,
  SettingsSwitchRow,
  type SettingsOption,
} from "./settings-rows"
import { SettingsSection } from "./settings-section"

/**
 * How this member wants to be quizzed.
 *
 * Every value here is a column on `user_settings`, so it follows them to a new
 * phone. The defaults come from the schema, which is why nothing in this file
 * hardcodes one.
 *
 * `feedbackTiming` leads because it decides what kind of session this is, and
 * because two settings below it become meaningless under `at_end` — those are
 * disabled rather than hidden, so it is visible *why* they stopped applying.
 */

const FEEDBACK_OPTIONS: SettingsOption<FeedbackTiming>[] = (
  ["instant", "on_next", "at_end"] as const
).map((value) => ({
  value,
  label: FEEDBACK_TIMING_LABELS[value].title,
  description: FEEDBACK_TIMING_LABELS[value].description,
}))

const SOURCE_OPTIONS: SettingsOption<QuestionSource>[] = (
  ["all", "unanswered", "incorrect", "bookmarked"] as const
).map((value) => ({
  value,
  label: QUESTION_SOURCE_LABELS[value].title,
  description: QUESTION_SOURCE_LABELS[value].description,
}))

const DIFFICULTY_OPTIONS: SettingsOption<DifficultyFilter>[] = (
  ["all", "easy", "medium", "hard"] as const
).map((value) => ({
  value,
  label: DIFFICULTY_FILTER_LABELS[value],
}))

const TIMER_OPTIONS: SettingsOption<TimerMode>[] = (
  ["off", "per_question", "whole_session"] as const
).map((value) => ({ value, label: TIMER_MODE_LABELS[value] }))

type StudyPreferencesSectionProps = {
  settings: MemberSettings
  onChange: (patch: Partial<MemberSettings>) => void
}

export const StudyPreferencesSection = memo(function StudyPreferencesSection({
  settings,
  onChange,
}: StudyPreferencesSectionProps) {
  const autoAdvanceApplies = isAutoAdvanceApplicable(settings)

  return (
    <>
      <SettingsSection
        title="Feedback"
        description="When an answer is marked right or wrong."
      >
        <SettingsOptionRow
          label="Reveal the answer"
          options={FEEDBACK_OPTIONS}
          value={settings.feedbackTiming}
          onChange={(feedbackTiming) => onChange({ feedbackTiming })}
        />

        <SettingsSwitchRow
          label="Show explanations"
          description="The rationale under a revealed answer."
          value={settings.showExplanations}
          onChange={(showExplanations) => onChange({ showExplanations })}
        />

        <SettingsSwitchRow
          label="Move on automatically"
          description={
            autoAdvanceApplies
              ? "Advance a moment after the answer is revealed."
              : "Not used when answers are revealed at the end."
          }
          value={settings.autoAdvance}
          disabled={!autoAdvanceApplies}
          onChange={(autoAdvance) => onChange({ autoAdvance })}
        />

        {settings.autoAdvance && autoAdvanceApplies ? (
          <SettingsStepperRow
            label="Wait before advancing"
            value={settings.autoAdvanceSeconds}
            min={1}
            max={30}
            step={1}
            formatValue={(value) => `${value}s`}
            onChange={(autoAdvanceSeconds) => onChange({ autoAdvanceSeconds })}
          />
        ) : null}
      </SettingsSection>

      <SettingsSection
        title="Which questions"
        description="The pool a new sitting draws from."
      >
        <SettingsOptionRow
          label="Source"
          options={SOURCE_OPTIONS}
          value={settings.questionSource}
          onChange={(questionSource) => onChange({ questionSource })}
        />

        <SettingsOptionRow
          label="Difficulty"
          options={DIFFICULTY_OPTIONS}
          value={settings.difficultyFilter}
          onChange={(difficultyFilter) => onChange({ difficultyFilter })}
        />

        <SettingsStepperRow
          label="Questions per sitting"
          description="Zero means the whole paper."
          value={settings.questionsPerSession}
          min={0}
          max={200}
          step={5}
          formatValue={(value) => (value === 0 ? "All" : String(value))}
          onChange={(questionsPerSession) => onChange({ questionsPerSession })}
        />
      </SettingsSection>

      <SettingsSection
        title="During a sitting"
        description="Order, skipping, and the clock."
      >
        <SettingsSwitchRow
          label="Shuffle questions"
          description="Change the order they appear in. Item numbers stay the same."
          value={settings.shuffleQuestions}
          onChange={(shuffleQuestions) => onChange({ shuffleQuestions })}
        />

        <SettingsSwitchRow
          label="Shuffle choices"
          description="Rearrange the options under each question."
          value={settings.shuffleChoices}
          onChange={(shuffleChoices) => onChange({ shuffleChoices })}
        />

        <SettingsSwitchRow
          label="Allow skipping"
          description="Move on without choosing an answer."
          value={settings.allowSkip}
          onChange={(allowSkip) => onChange({ allowSkip })}
        />

        <SettingsOptionRow
          label="Timer"
          options={TIMER_OPTIONS}
          value={settings.timerMode}
          onChange={(timerMode) => onChange({ timerMode })}
        />

        {settings.timerMode !== "off" ? (
          <SettingsStepperRow
            label={
              settings.timerMode === "per_question"
                ? "Seconds per question"
                : "Minutes per sitting"
            }
            value={
              settings.timerMode === "per_question"
                ? settings.timerSeconds
                : Math.round(settings.timerSeconds / 60)
            }
            min={settings.timerMode === "per_question" ? 5 : 1}
            max={settings.timerMode === "per_question" ? 300 : 600}
            step={settings.timerMode === "per_question" ? 5 : 5}
            formatValue={(value) =>
              settings.timerMode === "per_question" ? `${value}s` : `${value}m`
            }
            onChange={(value) =>
              onChange({
                timerSeconds:
                  settings.timerMode === "per_question" ? value : value * 60,
              })
            }
          />
        ) : null}
      </SettingsSection>
    </>
  )
})
