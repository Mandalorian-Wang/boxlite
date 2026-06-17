/*
 * Copyright Daytona Platforms Inc.
 * SPDX-License-Identifier: AGPL-3.0
 */

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { RoutePath } from '@/enums/RoutePath'
import { useCreateBoxMutation } from '@/hooks/mutations/useCreateBoxMutation'
import { useSelectedOrganization } from '@/hooks/useSelectedOrganization'
import { getBoxRouteId } from '@/lib/box-identity'
import { handleApiError } from '@/lib/error-handling'
import { cn } from '@/lib/utils'
import type { Box } from '@boxlite-ai/api-client'
import { useForm } from '@tanstack/react-form'
import { Cpu, HardDrive, MemoryStick, Package, Plus, type LucideIcon } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { NumericFormat } from 'react-number-format'
import { createSearchParams, generatePath, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'

const NAME_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/

const isOptionalPositiveInteger = (value: string | undefined) => {
  const trimmedValue = value?.trim()
  if (!trimmedValue) return true
  if (!/^\d+$/.test(trimmedValue)) return false

  const numericValue = Number(trimmedValue)
  return Number.isSafeInteger(numericValue) && numericValue >= 1
}

const parseOptionalInteger = (value: string | undefined) => {
  const trimmedValue = value?.trim()
  return trimmedValue ? Number(trimmedValue) : undefined
}

const formSchema = z.object({
  name: z
    .string()
    .optional()
    .refine((val) => !val || NAME_REGEX.test(val), 'Only letters, digits, dots, underscores and dashes are allowed'),
  image: z.string().optional(),
  cpu: z.string().optional().refine(isOptionalPositiveInteger, 'Enter a whole number, 1 or greater'),
  memory: z.string().optional().refine(isOptionalPositiveInteger, 'Enter a whole number, 1 or greater'),
  disk: z.string().optional().refine(isOptionalPositiveInteger, 'Enter a whole number, 1 or greater'),
})

type FormValues = z.input<typeof formSchema>

const defaultValues: FormValues = {
  name: '',
  image: '',
  cpu: '',
  memory: '',
  disk: '',
}

type ResourceFieldName = 'cpu' | 'memory' | 'disk'

const BOX_CREATE_DEFAULTS: Record<ResourceFieldName, string> = {
  cpu: '1',
  memory: '1',
  disk: '10',
}

const SUPPORTED_BOX_IMAGES = [
  {
    id: 'base',
    name: 'Base',
    ref: 'ghcr.io/boxlite-ai/boxlite-agent-base:20260605-p0-r3',
    isDefault: true,
  },
  {
    id: 'python',
    name: 'Python',
    ref: 'ghcr.io/boxlite-ai/boxlite-agent-python:20260605-p0-r3',
    isDefault: false,
  },
  {
    id: 'node',
    name: 'Node.js',
    ref: 'ghcr.io/boxlite-ai/boxlite-agent-node:20260605-p0-r3',
    isDefault: false,
  },
] as const

const RESOURCE_FIELDS: Array<{
  name: ResourceFieldName
  label: string
  unit: string
  Icon: LucideIcon
}> = [
  { name: 'cpu', label: 'CPU', unit: 'vCPU', Icon: Cpu },
  { name: 'memory', label: 'Memory', unit: 'GiB', Icon: MemoryStick },
  { name: 'disk', label: 'Disk', unit: 'GiB', Icon: HardDrive },
]

export const CreateBoxDialog = ({
  className,
  triggerClassName,
  open: controlledOpen,
  onOpenChange,
  onCreated,
}: {
  className?: string
  triggerClassName?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onCreated?: (box: Box) => void
}) => {
  const navigate = useNavigate()
  const [internalOpen, setInternalOpen] = useState(false)
  const [focusedResourceField, setFocusedResourceField] = useState<string | null>(null)
  const open = controlledOpen ?? internalOpen
  const setOpen = onOpenChange ?? setInternalOpen

  const { selectedOrganization } = useSelectedOrganization()
  const { reset: resetCreateBoxMutation, ...createBoxMutation } = useCreateBoxMutation()
  const formRef = useRef<HTMLFormElement>(null)
  const defaultImage = SUPPORTED_BOX_IMAGES.find((image) => image.isDefault) ?? SUPPORTED_BOX_IMAGES[0]

  const form = useForm({
    defaultValues,
    validators: {
      onSubmit: formSchema,
    },
    onSubmitInvalid: () => {
      const formEl = formRef.current
      if (!formEl) return
      const invalidInput = formEl.querySelector('[aria-invalid="true"]') as HTMLInputElement | null
      if (invalidInput) {
        invalidInput.scrollIntoView({ behavior: 'smooth', block: 'center' })
        invalidInput.focus()
      }
    },
    onSubmit: async ({ value }) => {
      if (!selectedOrganization?.id) {
        toast.error('Select an organization to create a box.')
        return
      }

      let boxId: string | undefined = undefined
      try {
        const resources = {
          cpu: parseOptionalInteger(value.cpu) ?? Number(BOX_CREATE_DEFAULTS.cpu),
          memory: parseOptionalInteger(value.memory) ?? Number(BOX_CREATE_DEFAULTS.memory),
          disk: parseOptionalInteger(value.disk) ?? Number(BOX_CREATE_DEFAULTS.disk),
        }

        const box = await createBoxMutation.mutateAsync({
          name: value.name?.trim() || undefined,
          image: value.image || defaultImage.ref,
          network: { mode: 'enabled' },
          resources,
        })
        boxId = getBoxRouteId(box)
        onCreated?.(box)

        toast.success('Box created')
        setOpen(false)

        if (boxId) {
          navigate({
            pathname: generatePath(RoutePath.BOX_DETAILS, { boxId }),
            search: `${createSearchParams({
              tab: 'terminal',
            })}`,
          })
        }
      } catch (error) {
        handleApiError(error, 'Failed to create box')
      }
    },
  })

  const resetState = useCallback(() => {
    form.reset(defaultValues)
    setFocusedResourceField(null)
    resetCreateBoxMutation()
  }, [resetCreateBoxMutation, form])

  useEffect(() => {
    if (open) {
      resetState()
    }
  }, [open, resetState])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm" title="Create Box" className={cn('w-full sm:w-auto', triggerClassName)}>
          <Plus className="size-4" />
          <span>Create Box</span>
        </Button>
      </DialogTrigger>
      <DialogContent className={cn('sm:max-w-xl', className)}>
        <DialogHeader>
          <DialogTitle>Create Box</DialogTitle>
          <DialogDescription>Spin up an isolated environment to run code.</DialogDescription>
        </DialogHeader>

        <form
          ref={formRef}
          id="create-box-form"
          className="flex flex-col gap-6 py-2"
          onSubmit={(e) => {
            e.preventDefault()
            e.stopPropagation()
            form.handleSubmit()
          }}
        >
          <form.Field name="name">
            {(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Name</FieldLabel>
                  <Input
                    aria-invalid={isInvalid}
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="my-box"
                  />
                  {field.state.meta.errors.length > 0 && field.state.meta.isTouched && (
                    <FieldError errors={field.state.meta.errors} />
                  )}
                </Field>
              )
            }}
          </form.Field>

          <form.Field name="image">
            {(field) => {
              const selectedImageRef = field.state.value || defaultImage?.ref || ''
              return (
                <Field>
                  <FieldLabel htmlFor={field.name} className="flex items-center gap-1.5">
                    <Package className="size-3.5" />
                    Image
                  </FieldLabel>
                  <Select value={selectedImageRef} onValueChange={(value) => field.handleChange(value)}>
                    <SelectTrigger id={field.name} name={field.name}>
                      <SelectValue placeholder="Select image" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_BOX_IMAGES.map((image) => (
                        <SelectItem key={image.id} value={image.ref}>
                          {image.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )
            }}
          </form.Field>

          <div className="space-y-2.5">
            <div>
              <Label>Resources</Label>
              <p className="text-xs text-muted-foreground">Leave blank to use defaults.</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {RESOURCE_FIELDS.map(({ name, label, unit, Icon }) => (
                <form.Field key={name} name={name}>
                  {(field) => {
                    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                    const defaultValue = BOX_CREATE_DEFAULTS[name]
                    return (
                      <div className="min-w-0 space-y-1.5">
                        <Label
                          htmlFor={field.name}
                          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
                        >
                          <Icon className="size-3.5" />
                          {label}
                        </Label>
                        <div className="relative">
                          <NumericFormat
                            customInput={Input}
                            aria-invalid={isInvalid}
                            id={field.name}
                            className="w-full pr-11 text-right font-medium tabular-nums placeholder:font-normal placeholder:text-muted-foreground/55"
                            placeholder={focusedResourceField === field.name ? '' : defaultValue}
                            decimalScale={0}
                            allowNegative={false}
                            isAllowed={(values) => values.floatValue === undefined || values.floatValue >= 1}
                            value={field.state.value ?? ''}
                            onFocus={() => setFocusedResourceField(field.name)}
                            onBlur={() => {
                              field.handleBlur()
                              setFocusedResourceField((currentField) =>
                                currentField === field.name ? null : currentField,
                              )
                            }}
                            onValueChange={(values) => field.handleChange(values.value)}
                          />
                          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground">
                            {unit}
                          </span>
                        </div>
                        {field.state.meta.errors.length > 0 && field.state.meta.isTouched && (
                          <FieldError errors={field.state.meta.errors} />
                        )}
                      </div>
                    )
                  }}
                </form.Field>
              ))}
            </div>
          </div>
        </form>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </DialogClose>
          <form.Subscribe
            selector={(state) => state.isSubmitting}
            children={(isSubmitting) => (
              <Button
                type="submit"
                form="create-box-form"
                variant="default"
                disabled={isSubmitting || !selectedOrganization?.id}
              >
                {isSubmitting && <Spinner />}
                Create
              </Button>
            )}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
