import { Trans, useTranslation } from 'react-i18next'
import { ConfirmDialog } from './ConfirmDialog'
import type { ConversationLaunchIntent } from '#/features/sessions/useConversationLauncher'
import type { Persona } from '#/lib/types'

interface ConversationLauncherDialogProps {
  initiatorPersona: Persona | null
  targetPersona: Persona | null
  intent: ConversationLaunchIntent | null
  isSubmitting?: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function ConversationLauncherDialog({
  initiatorPersona,
  targetPersona,
  intent,
  isSubmitting = false,
  onCancel,
  onConfirm,
}: ConversationLauncherDialogProps) {
  const { t } = useTranslation()
  const isContinue = intent === 'continue'

  return (
    <ConfirmDialog
      isOpen={targetPersona !== null && intent !== null}
      isSubmitting={isSubmitting}
      title={t(isContinue ? 'plaza.continueConversation' : 'plaza.startConversation')}
      description={
        targetPersona ? (
          <Trans
            i18nKey={
              isContinue
                ? 'plaza.continueConversationDesc'
                : 'plaza.startConversationDesc'
            }
            values={{
              initiator: initiatorPersona?.displayName ?? '',
              target: targetPersona.displayName,
            }}
            components={{ strong: <strong /> }}
          />
        ) : null
      }
      cancelLabel={t('plaza.cancel')}
      confirmLabel={t(isContinue ? 'plaza.continueChat' : 'plaza.startChat')}
      confirmingLabel={t('plaza.starting')}
      onCancel={onCancel}
      onConfirm={onConfirm}
      maxWidthClassName="max-w-sm"
    />
  )
}
