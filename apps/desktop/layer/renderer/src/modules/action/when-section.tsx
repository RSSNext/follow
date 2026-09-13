import { Button } from "@follow/components/ui/button/index.js"
import { Input } from "@follow/components/ui/input/index.js"
import { SegmentGroup, SegmentItem } from "@follow/components/ui/segment/index.js"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@follow/components/ui/select/index.jsx"
import { ResponsiveSelect } from "@follow/components/ui/select/responsive.js"
import { filterFieldOptions, filterOperatorOptions } from "@follow/store/action/constant"
import { useActionRule } from "@follow/store/action/hooks"
import { actionActions } from "@follow/store/action/store"
import type { ActionFeedField, ActionOperation } from "@follow-app/client-sdk"
import { Fragment } from "react"
import { useTranslation } from "react-i18next"

import { ViewSelectContent } from "~/modules/feed/view-select-content"

type WhenSectionProps = {
  index: number
}

export const WhenSection = ({ index }: WhenSectionProps) => {
  const { t } = useTranslation("settings")

  const disabled = useActionRule(index, (a) => a.result.disabled)
  const condition = useActionRule(index, (a) => a.condition) ?? []

  const mode = condition.length > 0 ? "filter" : "all"

  const handleModeChange = (value: "all" | "filter") => {
    if (value === "all" && condition.length > 0) {
      actionActions.toggleRuleFilter(index)
    }

    if (value === "filter" && condition.length === 0) {
      actionActions.toggleRuleFilter(index)
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex size-5 items-center justify-center rounded-full bg-orange text-[11px] font-bold text-white shadow-sm">
            1
          </span>
          <span className="text-sm font-bold uppercase tracking-wide text-text">
            {t("actions.action_card.when_feeds_match")}
          </span>
        </div>
        <SegmentGroup
          value={mode}
          onValueChanged={(value) => handleModeChange(value as "all" | "filter")}
        >
          <SegmentItem value="all" label={t("actions.action_card.all")} />
          <SegmentItem value="filter" label={t("actions.action_card.custom_filters")} />
        </SegmentGroup>
      </div>

      {mode === "filter" && (
        <div className="flex flex-col gap-4">
          {condition.map((orConditions, orConditionIdx) => {
            return (
              <Fragment key={orConditionIdx}>
                <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border bg-transparent p-4">
                  {orConditions.map((item, conditionIdx) => {
                    const actionConditionIndex = {
                      ruleIndex: index,
                      groupIndex: orConditionIdx,
                      conditionIndex: conditionIdx,
                    }

                    const change = (key: string, value: string | number) => {
                      actionActions.pathCondition(actionConditionIndex, {
                        [key]: value,
                      })
                    }

                    const type =
                      filterFieldOptions.find((option) => option.value === item.field)?.type ||
                      "text"

                    return (
                      <div key={conditionIdx} className="flex flex-col gap-2">
                        <div className="flex flex-col gap-2 rounded-lg border border-fill-secondary bg-transparent p-3 @[800px]:flex-row @[800px]:items-center">
                          <ResponsiveSelect
                            placeholder="Select Field"
                            disabled={disabled}
                            value={item.field}
                            onValueChange={(value) => change("field", value as ActionFeedField)}
                            items={filterFieldOptions.map((option) => ({
                              ...option,
                              label: t(option.label),
                            }))}
                            triggerClassName="h-9 min-w-[160px] @[800px]:flex-1"
                          />
                          <OperationSelect
                            type={type}
                            disabled={disabled}
                            value={item.operator}
                            onValueChange={(value) => change("operator", value)}
                          />
                          <ValueInput
                            type={type}
                            operator={item.operator}
                            value={item.value}
                            onChange={(value) => change("value", value)}
                            disabled={disabled}
                          />
                          <button
                            type="button"
                            aria-label={t("actions.action_card.summary.delete")}
                            className="flex size-9 shrink-0 items-center justify-center self-end rounded-lg border border-fill-secondary bg-transparent text-text-secondary transition-colors hover:border-fill hover:bg-fill-quinary hover:text-text disabled:opacity-50 @[800px]:self-center"
                            disabled={disabled}
                            onClick={() => {
                              actionActions.deleteConditionItem(actionConditionIndex)
                            }}
                          >
                            <i className="i-mgc-delete-2-cute-re" />
                          </button>
                        </div>
                        {conditionIdx !== orConditions.length - 1 && (
                          <div className="flex items-center text-xs text-text-secondary">
                            <span className="rounded-md border border-border bg-material-medium px-2 py-0.5 font-bold uppercase tracking-wide">
                              {t("actions.action_card.and")}
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                  <Button
                    variant="outline"
                    size="sm"
                    buttonClassName="w-fit border-dashed border-border "
                    disabled={disabled}
                    onClick={() => {
                      actionActions.addConditionItem({
                        ruleIndex: index,
                        groupIndex: orConditionIdx,
                      })
                    }}
                  >
                    <i className="i-mgc-add-cute-re mr-2" />
                    {t("actions.action_card.and")}
                  </Button>
                </div>
                {orConditionIdx !== condition.length - 1 && (
                  <div className="flex items-center justify-center">
                    <span className="rounded-md border border-border bg-material-medium px-3 py-1 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                      {t("actions.action_card.or")}
                    </span>
                  </div>
                )}
              </Fragment>
            )
          })}
          <Button
            variant="outline"
            size="sm"
            buttonClassName="w-fit border-dashed border-border "
            onClick={() => {
              actionActions.addConditionGroup({ ruleIndex: index })
            }}
            disabled={disabled}
          >
            <i className="i-mgc-add-cute-re mr-2" />
            {t("actions.action_card.or")}
          </Button>
        </div>
      )}
    </section>
  )
}

const OperationSelect = ({
  type,
  value,
  onValueChange,
  disabled,
}: {
  type: "text" | "number" | "view" | "status"
  value?: ActionOperation
  onValueChange?: (value: ActionOperation) => void
  disabled?: boolean
}) => {
  const { t } = useTranslation("settings")

  const options = filterOperatorOptions
    .filter((option) => option.types.includes(type))
    .map((option) => ({
      ...option,
      label: t(option.label),
    }))
  if (options.length === 1 && value === undefined) {
    onValueChange?.(options[0]!.value as ActionOperation)
  }
  return (
    <ResponsiveSelect
      placeholder="Select Operation"
      disabled={disabled}
      value={value}
      onValueChange={(nextValue) => onValueChange?.(nextValue as ActionOperation)}
      items={options}
      triggerClassName="h-9 min-w-[150px]"
    />
  )
}

const ValueInput = ({
  type,
  operator,
  value,
  onChange,
  disabled,
}: {
  type: string
  operator?: ActionOperation
  value?: string | number
  onChange: (value: string | number) => void
  disabled?: boolean
}) => {
  const { t } = useTranslation("settings")

  switch (type) {
    case "view": {
      return (
        <Select
          disabled={disabled}
          onValueChange={(nextValue) => onChange(nextValue)}
          value={value as string | undefined}
        >
          <CommonSelectTrigger />
          <ViewSelectContent />
        </Select>
      )
    }
    case "status": {
      if (value === undefined) {
        onChange("collected")
      }
      return (
        <Select
          disabled={disabled}
          onValueChange={(nextValue) => onChange(nextValue)}
          value={value as string | undefined}
        >
          <CommonSelectTrigger />
          <SelectContent>
            <SelectItem value="collected">Collected</SelectItem>
            <SelectItem value="read">Read</SelectItem>
          </SelectContent>
        </Select>
      )
    }
    case "number": {
      return (
        <Input
          disabled={disabled}
          type="number"
          value={value}
          className="h-9"
          onChange={(event) => onChange(event.target.value)}
        />
      )
    }
    default: {
      return (
        <div className="flex flex-col gap-1.5 @[800px]:flex-1">
          <Input
            disabled={disabled}
            value={value as string | undefined}
            className="h-9"
            onChange={(event) => onChange(event.target.value)}
          />
          {operator === "regex" && (
            <p className="text-xs leading-relaxed text-text-tertiary">
              {t("actions.action_card.regex_help")}
            </p>
          )}
        </div>
      )
    }
  }
}

const CommonSelectTrigger = () => (
  <SelectTrigger className="h-9 min-w-[150px]">
    <SelectValue />
  </SelectTrigger>
)
