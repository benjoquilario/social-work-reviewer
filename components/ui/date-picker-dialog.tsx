import { useCallback, useEffect, useMemo, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react-native"
import { Pressable, View } from "react-native"

import { cn } from "@/lib/utils"
import { useThemePalette } from "@/hooks/use-theme"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { IconButton } from "@/components/ui/icon-button"
import { Text } from "@/components/ui/text"

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"] as const

const MONTH_TITLE_FMT = new Intl.DateTimeFormat("en-PH", {
  month: "long",
  year: "numeric",
})

const FULL_DATE_FMT = new Intl.DateTimeFormat("en-PH", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
})

type CalendarCell = {
  key: string
  day: number | null
  date: Date | null
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function isSameDay(left: Date | null, right: Date | null) {
  return (
    !!left &&
    !!right &&
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  )
}

/**
 * Six rows of seven so the grid height never changes between months — a
 * five-row month next to a six-row one makes the dialog jump as you page.
 */
function buildMonthCells(year: number, monthIndex: number): CalendarCell[] {
  const firstWeekday = new Date(year, monthIndex, 1).getDay()
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()

  return Array.from({ length: 42 }, (_, index) => {
    const day = index - firstWeekday + 1
    const inMonth = day >= 1 && day <= daysInMonth

    return {
      key: `cell-${index}`,
      day: inMonth ? day : null,
      date: inMonth ? new Date(year, monthIndex, day) : null,
    }
  })
}

type DatePickerDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Currently stored value, or null when nothing is set yet. */
  value: Date | null
  onConfirm: (date: Date) => void
  onClear?: () => void
  title?: string
  description?: string
  confirmLabel?: string
}

/**
 * Month-grid date picker in a dialog.
 *
 * Hand-rolled rather than pulling in `@react-native-community/datetimepicker`:
 * this needs one future date on both platforms with the app's own palette, and
 * the native picker would add a config-plugin dependency and a second visual
 * language for a single field.
 *
 * Days before today are rendered but not selectable — every use of this is
 * scheduling something ahead.
 */
function DatePickerDialog({
  open,
  onOpenChange,
  value,
  onConfirm,
  onClear,
  title = "Pick a date",
  description,
  confirmLabel = "Save",
}: DatePickerDialogProps) {
  const theme = useThemePalette()
  const today = useMemo(() => startOfDay(new Date()), [])
  const initial = value ?? today

  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(initial.getFullYear(), initial.getMonth(), 1)
  )
  const [selected, setSelected] = useState<Date | null>(value)

  // The dialog stays mounted behind `Modal visible`, so this state survives
  // being closed. Without a resync, cancelling a change or clearing the date
  // and reopening would show the stale draft rather than what is stored.
  useEffect(() => {
    if (!open) {
      return
    }

    const anchor = value ?? today
    setSelected(value)
    setVisibleMonth(new Date(anchor.getFullYear(), anchor.getMonth(), 1))
  }, [open, today, value])

  const cells = useMemo(
    () => buildMonthCells(visibleMonth.getFullYear(), visibleMonth.getMonth()),
    [visibleMonth]
  )

  const goToPreviousMonth = useCallback(() => {
    setVisibleMonth(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() - 1, 1)
    )
  }, [])

  const goToNextMonth = useCallback(() => {
    setVisibleMonth(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + 1, 1)
    )
  }, [])

  const handleConfirm = useCallback(() => {
    if (selected) {
      onConfirm(selected)
    }
  }, [onConfirm, selected])

  const handleClear = useCallback(() => {
    setSelected(null)
    onClear?.()
  }, [onClear])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>

        {/* Month pager */}
        <View className="mt-4 flex-row items-center justify-between">
          <IconButton
            label="Previous month"
            size="sm"
            variant="muted"
            onPress={goToPreviousMonth}
          >
            <ChevronLeft size={18} color={theme.foreground} strokeWidth={2.4} />
          </IconButton>

          <Text variant="subheading">
            {MONTH_TITLE_FMT.format(visibleMonth)}
          </Text>

          <IconButton
            label="Next month"
            size="sm"
            variant="muted"
            onPress={goToNextMonth}
          >
            <ChevronRight
              size={18}
              color={theme.foreground}
              strokeWidth={2.4}
            />
          </IconButton>
        </View>

        {/* Weekday header */}
        <View className="mt-3 flex-row">
          {WEEKDAY_LABELS.map((label, index) => (
            <View key={`weekday-${index}`} className="flex-1 items-center">
              <Text variant="label">{label}</Text>
            </View>
          ))}
        </View>

        {/* Day grid */}
        <View className="mt-1 flex-row flex-wrap">
          {cells.map((cell) => {
            if (!cell.date) {
              return (
                <View
                  key={cell.key}
                  className="h-11 items-center justify-center"
                  style={{ width: `${100 / 7}%` }}
                />
              )
            }

            const isSelected = isSameDay(cell.date, selected)
            const isToday = isSameDay(cell.date, today)
            const isPast = cell.date.getTime() < today.getTime()

            return (
              <View
                key={cell.key}
                className="h-11 items-center justify-center"
                style={{ width: `${100 / 7}%` }}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={FULL_DATE_FMT.format(cell.date)}
                  accessibilityState={{
                    selected: isSelected,
                    disabled: isPast,
                  }}
                  disabled={isPast}
                  onPress={() => setSelected(cell.date)}
                  className={cn(
                    "h-9 w-9 items-center justify-center rounded-full",
                    isSelected && "bg-primary",
                    !isSelected && isToday && "border border-primary/50"
                  )}
                >
                  <Text
                    className={cn(
                      "text-sm",
                      isSelected
                        ? "font-extrabold text-primary-foreground"
                        : isPast
                          ? "text-muted-foreground/40"
                          : isToday
                            ? "font-bold text-primary"
                            : "text-foreground"
                    )}
                  >
                    {cell.day}
                  </Text>
                </Pressable>
              </View>
            )
          })}
        </View>

        <DialogFooter>
          <Button
            size="lg"
            disabled={!selected}
            onPress={handleConfirm}
            accessibilityLabel={confirmLabel}
          >
            <Text>{confirmLabel}</Text>
          </Button>

          <View className="flex-row gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onPress={() => onOpenChange(false)}
            >
              <Text>Cancel</Text>
            </Button>

            {onClear ? (
              <Button
                variant="ghost"
                className="flex-1"
                onPress={handleClear}
              >
                <Text>Clear date</Text>
              </Button>
            ) : null}
          </View>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export { DatePickerDialog }
export type { DatePickerDialogProps }
