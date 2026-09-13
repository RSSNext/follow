import { Button } from "@follow/components/ui/button/index.js"
import { Input } from "@follow/components/ui/input/index.js"
import { Label } from "@follow/components/ui/label/index.jsx"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@follow/components/ui/select/index.js"
import type { ByokProviderName, UserByokProviderConfig } from "@follow/shared/settings/interface"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import { PROVIDER_OPTIONS } from "./constants"

interface ByokProviderModalContentProps {
  provider: UserByokProviderConfig | null
  configuredProviders?: ByokProviderName[]
  onSave: (provider: UserByokProviderConfig) => void
  onCancel: () => void
}

const EMPTY_CONFIGURED_PROVIDERS: ByokProviderName[] = []

export const ByokProviderModalContent = ({
  provider,
  configuredProviders = EMPTY_CONFIGURED_PROVIDERS,
  onSave,
  onCancel,
}: ByokProviderModalContentProps) => {
  const { t } = useTranslation("ai")

  // Filter out already configured providers, but keep the current one if editing
  const availableProviders = PROVIDER_OPTIONS.filter(
    (option) => !configuredProviders.includes(option.value) || option.value === provider?.provider,
  )

  // Get the first available provider or fallback to the current one
  const defaultProvider = availableProviders[0]?.value ?? provider?.provider ?? "openai"

  // Auto-fill base URL when Ollama is selected
  const getDefaultBaseURL = (p: ByokProviderName) => {
    if (p === "ollama") return "http://localhost:11434/v1"
    return provider?.provider === p ? (provider?.baseURL ?? null) : null
  }

  const [formData, setFormData] = useState<UserByokProviderConfig>({
    provider: provider?.provider ?? defaultProvider,
    baseURL: provider?.baseURL ?? getDefaultBaseURL(defaultProvider),
    apiKey: provider?.apiKey ?? null,
    model: provider?.model ?? null,
    headers: provider?.headers ?? {},
  })

  const handleProviderChange = (value: ByokProviderName) => {
    setFormData((prev) => ({
      ...prev,
      provider: value,
      // Auto-fill base URL for Ollama, preserve existing URL for other providers
      baseURL: value === "ollama" ? "http://localhost:11434/v1" : prev.baseURL,
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.provider) {
      return
    }
    onSave(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="min-w-[40ch] space-y-4">
      <div className="space-y-2">
        <Label htmlFor="provider">{t("byok.providers.form.provider")}</Label>
        <Select
          value={formData.provider}
          disabled={availableProviders.length === 0}
          onValueChange={(value) => handleProviderChange(value as ByokProviderName)}
        >
          <SelectTrigger id="provider">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableProviders.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="baseURL">{t("byok.providers.form.base_url")}</Label>
        <Input
          id="baseURL"
          type="url"
          placeholder={t("byok.providers.form.base_url_placeholder")}
          value={formData.baseURL ?? ""}
          onChange={(e) =>
            setFormData({
              ...formData,
              baseURL: e.target.value || null,
            })
          }
        />
        <p className="text-xs text-text-secondary">{t("byok.providers.form.base_url_help")}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="model">{t("byok.providers.form.model")}</Label>
        <Input
          id="model"
          type="text"
          placeholder={t("byok.providers.form.model_placeholder")}
          value={formData.model ?? ""}
          onChange={(e) =>
            setFormData({
              ...formData,
              model: e.target.value || null,
            })
          }
        />
        <p className="text-xs text-text-secondary">{t("byok.providers.form.model_help")}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="apiKey">{t("byok.providers.form.api_key")}</Label>
        <Input
          id="apiKey"
          type="password"
          placeholder={t("byok.providers.form.api_key_placeholder")}
          value={formData.apiKey ?? ""}
          onChange={(e) =>
            setFormData({
              ...formData,
              apiKey: e.target.value || null,
            })
          }
        />
        <p className="text-xs text-text-secondary">{t("byok.providers.form.api_key_help")}</p>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          {t("words.cancel", { ns: "common" })}
        </Button>
        <Button type="submit">{t("words.save", { ns: "common" })}</Button>
      </div>
    </form>
  )
}
