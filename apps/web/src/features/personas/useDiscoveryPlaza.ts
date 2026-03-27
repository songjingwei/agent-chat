import { usePersonaList } from './usePersonaList'
import { useMyPersonas } from './useMyPersonas'
import { useAuth } from '#/lib/auth-context'
import { useEffect, useState } from 'react'
import { buildPlazaSeed } from './plaza-seed'
import { useConversationLauncher } from '#/features/sessions/useConversationLauncher'

const PLAZA_PAGE_SIZE = 12
const CHATTED_PAGE_SIZE = 3
const CHATTED_FETCH_LIMIT = 18

export function useDiscoveryPlaza() {
  const [batch, setBatch] = useState(0)
  const [historyPage, setHistoryPage] = useState(0)
  const { user, isAuthenticated } = useAuth()
  const chattedSeed = buildPlazaSeed(user?.id, 0)
  const discoverySeed = buildPlazaSeed(user?.id, batch)
  const { personas: myPersonas, isLoading: myLoading } = useMyPersonas({
    enabled: isAuthenticated,
  })
  const myPersona = myPersonas[0] ?? null
  const discoveryEnabled = !isAuthenticated || !myLoading
  const chattedEnabled = Boolean(myPersona) && !myLoading

  const {
    personas: chattedCandidates,
    total: chattedTotal,
    isLoading: chattedLoading,
    error: chattedError,
  } = usePersonaList({
    limit: CHATTED_FETCH_LIMIT,
    seed: chattedSeed,
    viewerPersonaId: myPersona?.id,
    relationshipFilter: 'chatted',
    enabled: chattedEnabled,
  })

  const {
    personas: discoveryPersonas,
    total,
    isLoading: allLoading,
    error: allError,
  } = usePersonaList({
    excludeUserId: user?.id,
    limit: PLAZA_PAGE_SIZE,
    seed: discoverySeed,
    viewerPersonaId: myPersona?.id,
    relationshipFilter: myPersona ? 'new' : undefined,
    enabled: discoveryEnabled,
  })

  const {
    selectedTarget,
    selectedIntent,
    openConversation,
    confirmConversation,
    cancelConversation,
    isLaunchingConversation,
  } = useConversationLauncher(myPersona)

  const chattedPersonas = [...chattedCandidates].sort((left, right) => {
    const leftScore = left.relationship?.mutualScore ?? 0
    const rightScore = right.relationship?.mutualScore ?? 0
    if (rightScore !== leftScore) {
      return rightScore - leftScore
    }

    const leftTime = left.relationship?.lastInteractedAt
      ? new Date(left.relationship.lastInteractedAt).getTime()
      : 0
    const rightTime = right.relationship?.lastInteractedAt
      ? new Date(right.relationship.lastInteractedAt).getTime()
      : 0
    return rightTime - leftTime
  })
  const chattedPageCount =
    chattedPersonas.length === 0 ? 0 : Math.ceil(chattedPersonas.length / CHATTED_PAGE_SIZE)
  const activeHistoryPage =
    chattedPageCount === 0 ? 0 : Math.min(historyPage, chattedPageCount - 1)
  const visibleChattedPersonas = chattedPersonas.slice(
    activeHistoryPage * CHATTED_PAGE_SIZE,
    (activeHistoryPage + 1) * CHATTED_PAGE_SIZE,
  )

  useEffect(() => {
    setBatch(0)
  }, [user?.id])

  useEffect(() => {
    setHistoryPage(0)
  }, [user?.id, myPersona?.id])

  useEffect(() => {
    if (chattedPageCount === 0 && historyPage !== 0) {
      setHistoryPage(0)
      return
    }
    if (historyPage >= chattedPageCount && chattedPageCount > 0) {
      setHistoryPage(chattedPageCount - 1)
    }
  }, [chattedPageCount, historyPage])

  function shuffleDiscoveryBatch() {
    if (allLoading || total <= PLAZA_PAGE_SIZE) {
      return
    }
    setBatch((current) => {
      let next = current
      while (next === current) {
        next = Math.floor(Math.random() * 1000)
      }
      return next
    })
  }

  function goToPreviousHistoryPage() {
    if (activeHistoryPage <= 0) {
      return
    }
    setHistoryPage((current) => current - 1)
  }

  function goToNextHistoryPage() {
    if (activeHistoryPage >= chattedPageCount - 1) {
      return
    }
    setHistoryPage((current) => current + 1)
  }

  return {
    discoveryPersonas,
    chattedPersonas: visibleChattedPersonas,
    chattedTotal,
    hasChatHistory: chattedPersonas.length > 0,
    chattedPage: activeHistoryPage,
    chattedPageCount,
    canGoPreviousHistoryPage: activeHistoryPage > 0,
    canGoNextHistoryPage: chattedPageCount > 0 && activeHistoryPage < chattedPageCount - 1,
    goToPreviousHistoryPage,
    goToNextHistoryPage,
    total,
    pageSize: PLAZA_PAGE_SIZE,
    shuffleDiscoveryBatch,
    canShuffleDiscovery: total > PLAZA_PAGE_SIZE,
    myPersona,
    selectedTarget,
    selectedIntent,
    handleStartChat: openConversation,
    confirmStartChat: confirmConversation,
    cancelSelection: cancelConversation,
    isLoading: allLoading || myLoading || chattedLoading,
    isCreatingSession: isLaunchingConversation,
    error: allError ?? chattedError,
  }
}
