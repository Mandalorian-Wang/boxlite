/*
 * Copyright Daytona Platforms Inc.
 * SPDX-License-Identifier: AGPL-3.0
 */

import { OrganizationSuspendedError } from '@/api/errors'
import { OnboardingGuideDialog } from '@/components/OnboardingGuideDialog'
import { PageLayout } from '@/components/PageLayout'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { FeatureFlags } from '@/enums/FeatureFlags'
import { LocalStorageKey } from '@/enums/LocalStorageKey'
import { RoutePath } from '@/enums/RoutePath'
import { useDeleteBoxMutation } from '@/hooks/mutations/useDeleteBoxMutation'
import { useRecoverBoxMutation } from '@/hooks/mutations/useRecoverBoxMutation'
import { useStartBoxMutation } from '@/hooks/mutations/useStartBoxMutation'
import { useStopBoxMutation } from '@/hooks/mutations/useStopBoxMutation'
import { useBoxQuery } from '@/hooks/queries/useBoxQuery'
import { useConfig } from '@/hooks/useConfig'
import { useRegions } from '@/hooks/useRegions'
import { useBoxWsSync } from '@/hooks/useBoxWsSync'
import { useSelectedOrganization } from '@/hooks/useSelectedOrganization'
import { isBoxContentTabAvailable } from '@/lib/dashboard-features'
import { handleApiError } from '@/lib/error-handling'
import { setLocalStorageItem } from '@/lib/local-storage'
import {
  ONBOARDING_ENTRY_HIGHLIGHT_EVENT,
  mergeOnboardingProgress,
  ONBOARDING_PROGRESS_EVENT,
  readOnboardingProgress,
  type OnboardingProgress,
} from '@/lib/onboarding-progress'
import { isTransitioning } from '@/lib/utils/box'
import { OrganizationRolePermissionsEnum, OrganizationUserRoleEnum } from '@boxlite-ai/api-client'
import { isAxiosError } from 'axios'
import { Container, RefreshCw } from 'lucide-react'
import { useQueryState } from 'nuqs'
import { useFeatureFlagEnabled } from 'posthog-js/react'
import { useCallback, useEffect, useState } from 'react'
import { useAuth } from 'react-oidc-context'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { CreateSshAccessDialog } from './CreateSshAccessDialog'
import { RevokeSshAccessDialog } from './RevokeSshAccessDialog'
import { BoxContentTabs } from './BoxContentTabs'
import { BoxHeader } from './BoxHeader'
import { InfoPanelSkeleton, BoxInfoPanel } from './BoxInfoPanel'
import { tabParser } from './SearchParams'

export default function BoxDetails() {
  const { boxId } = useParams<{ boxId: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const config = useConfig()
  const { user } = useAuth()
  const userId = user?.profile.sub
  const { authenticatedUserOrganizationMember, selectedOrganization, authenticatedUserHasPermission } =
    useSelectedOrganization()
  const { getRegionName } = useRegions()

  const experimentsEnabled = useFeatureFlagEnabled(FeatureFlags.ORGANIZATION_EXPERIMENTS)

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [createSshDialogOpen, setCreateSshDialogOpen] = useState(false)
  const [revokeSshDialogOpen, setRevokeSshDialogOpen] = useState(false)
  const [showOnboardingDialog, setShowOnboardingDialog] = useState(false)
  const [onboardingProgress, setOnboardingProgress] = useState<OnboardingProgress>(() => readOnboardingProgress(userId))
  const [tab, setTab] = useQueryState('tab', tabParser)

  const updateOnboardingProgress = useCallback(
    (progress: OnboardingProgress) => {
      setOnboardingProgress(mergeOnboardingProgress(userId, progress))
    },
    [userId],
  )

  useEffect(() => {
    setOnboardingProgress(readOnboardingProgress(userId))
  }, [userId])

  useEffect(() => {
    const handleOnboardingProgress = (event: Event) => {
      const progress = (event as CustomEvent<OnboardingProgress>).detail
      setOnboardingProgress(progress ?? readOnboardingProgress(userId))
    }

    window.addEventListener(ONBOARDING_PROGRESS_EVENT, handleOnboardingProgress)
    return () => window.removeEventListener(ONBOARDING_PROGRESS_EVENT, handleOnboardingProgress)
  }, [userId])

  useEffect(() => {
    if (!selectedOrganization || !user?.profile.sub) {
      return
    }

    if (searchParams.get('onboarding') === '1') {
      setShowOnboardingDialog(true)
    }
  }, [searchParams, selectedOrganization, user?.profile.sub])

  const clearOnboardingUrlParam = useCallback(() => {
    if (searchParams.get('onboarding') !== '1') {
      return
    }

    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('onboarding')
    setSearchParams(nextParams, { replace: true })
  }, [searchParams, setSearchParams])

  const closeOnboardingDialog = useCallback(() => {
    if (userId) {
      setLocalStorageItem(`${LocalStorageKey.SkipOnboardingPrefix}${userId}`, 'true')
    }
    setShowOnboardingDialog(false)
    window.setTimeout(() => {
      window.dispatchEvent(new Event(ONBOARDING_ENTRY_HIGHLIGHT_EVENT))
      clearOnboardingUrlParam()
    }, 220)
  }, [clearOnboardingUrlParam, userId])

  // Overview now renders inline above the tabs, so it is no longer a selectable tab.
  useEffect(() => {
    if (tab === 'overview') {
      setTab(experimentsEnabled ? 'logs' : 'terminal')
    }
  }, [tab, setTab, experimentsEnabled])

  // Coerce hidden tabs back to a supported default.
  useEffect(() => {
    if (!isBoxContentTabAvailable(tab, { experimentsEnabled })) {
      setTab('terminal')
    }
  }, [experimentsEnabled, tab, setTab])

  const { data: box, isLoading, isError, error, refetch, isFetching } = useBoxQuery(boxId ?? '')
  const isNotFound = isError && isAxiosError(error.cause) && error.cause?.status === 404
  useBoxWsSync({ boxId })

  useEffect(() => {
    if (box && !onboardingProgress.boxCreated) {
      updateOnboardingProgress({ boxCreated: true })
    }
  }, [onboardingProgress.boxCreated, box, updateOnboardingProgress])

  useEffect(() => {
    if (box && tab === 'terminal' && !onboardingProgress.terminalOpened) {
      updateOnboardingProgress({ boxCreated: true, terminalOpened: true })
    }
  }, [onboardingProgress.terminalOpened, box, tab, updateOnboardingProgress])

  const startMutation = useStartBoxMutation()
  const stopMutation = useStopBoxMutation()
  const recoverMutation = useRecoverBoxMutation()
  const deleteMutation = useDeleteBoxMutation()

  const writePermitted = authenticatedUserHasPermission(OrganizationRolePermissionsEnum.WRITE_BOXES)
  const deletePermitted = authenticatedUserHasPermission(OrganizationRolePermissionsEnum.DELETE_BOXES)
  const transitioning = box ? isTransitioning(box) : false
  const anyMutating =
    startMutation.isPending || stopMutation.isPending || recoverMutation.isPending || deleteMutation.isPending
  const actionsDisabled = anyMutating || transitioning

  const handleStart = async () => {
    if (!box) return
    try {
      await startMutation.mutateAsync({ boxId: box.id, detailRef: boxId })
      toast.success('Box started')
    } catch (error) {
      handleApiError(error, 'Failed to start box', {
        action:
          error instanceof OrganizationSuspendedError &&
          config.billingApiUrl &&
          authenticatedUserOrganizationMember?.role === OrganizationUserRoleEnum.OWNER ? (
            <Button variant="secondary" onClick={() => navigate(RoutePath.BILLING_WALLET)}>
              Go to billing
            </Button>
          ) : undefined,
      })
    }
  }

  const handleStop = async () => {
    if (!box) return
    try {
      await stopMutation.mutateAsync({ boxId: box.id, detailRef: boxId })
      toast.success('Box stopped')
    } catch (error) {
      handleApiError(error, 'Failed to stop box')
    }
  }

  const handleRecover = async () => {
    if (!box) return
    try {
      await recoverMutation.mutateAsync({ boxId: box.id, detailRef: boxId })
      toast.success('Box recovery started')
    } catch (error) {
      handleApiError(error, 'Failed to recover box')
    }
  }

  const handleDelete = async () => {
    if (!box) return
    try {
      await deleteMutation.mutateAsync({ boxId: box.id, detailRef: boxId })
      toast.success('Box deleted')
      setDeleteDialogOpen(false)
      navigate(RoutePath.BOXES)
    } catch (error) {
      handleApiError(error, 'Failed to delete box')
    }
  }

  return (
    <PageLayout className="!h-auto min-h-[var(--app-content-height,calc(100svh_-_3.5rem))]">
      <OnboardingGuideDialog
        open={showOnboardingDialog}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            closeOnboardingDialog()
          } else {
            setShowOnboardingDialog(true)
          }
        }}
        onProgressChange={updateOnboardingProgress}
        progress={onboardingProgress}
      />
      <BoxHeader
        box={box}
        isLoading={isLoading}
        writePermitted={writePermitted}
        deletePermitted={deletePermitted}
        actionsDisabled={actionsDisabled}
        isFetching={isFetching}
        onStart={handleStart}
        onStop={handleStop}
        onRecover={handleRecover}
        onDelete={() => setDeleteDialogOpen(true)}
        onRefresh={() => refetch()}
        onBack={() => navigate(RoutePath.BOXES)}
        onCreateSshAccess={() => setCreateSshDialogOpen(true)}
        onRevokeSshAccess={() => setRevokeSshDialogOpen(true)}
        mutations={{
          start: startMutation.isPending,
          stop: stopMutation.isPending,
          recover: recoverMutation.isPending,
        }}
      />

      {isNotFound ? (
        <div className="flex min-h-[60vh] items-center justify-center">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Container className="size-4" />
              </EmptyMedia>
              <EmptyTitle>Box not found</EmptyTitle>
              <EmptyDescription>Are you sure you're in the right organization?</EmptyDescription>
            </EmptyHeader>
            <Button variant="outline" size="sm" onClick={() => navigate(RoutePath.BOXES)}>
              Back to Boxes
            </Button>
          </Empty>
        </div>
      ) : (
        <div className="mx-auto flex w-full max-w-[1040px] flex-col gap-4 px-4 pt-6 pb-10 sm:px-5">
          {isLoading ? (
            <InfoPanelSkeleton />
          ) : isError || !box ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-border p-8 text-center text-muted-foreground">
              <p className="text-sm">Failed to load box details.</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="size-4" />
                Retry
              </Button>
            </div>
          ) : (
            <BoxInfoPanel box={box} getRegionName={getRegionName} />
          )}

          <BoxContentTabs
            box={box}
            isLoading={isLoading}
            experimentsEnabled={experimentsEnabled}
            tab={tab}
            onTabChange={setTab}
          />
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Box</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this box? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {boxId && (
        <>
          <CreateSshAccessDialog boxId={boxId} open={createSshDialogOpen} onOpenChange={setCreateSshDialogOpen} />
          <RevokeSshAccessDialog boxId={boxId} open={revokeSshDialogOpen} onOpenChange={setRevokeSshDialogOpen} />
        </>
      )}
    </PageLayout>
  )
}
