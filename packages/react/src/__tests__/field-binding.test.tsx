import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'

import { Form } from '../components/complex/Form'
import { Field } from '../components/complex/Field'
import { SubmitButton } from '../components/complex/SubmitButton'
import { Switch } from '../components/ui/Switch'
import { Slider } from '../components/ui/Slider'
import { RadioGroup } from '../components/ui/Radio'
import { Rate } from '../components/ui/Rate'
import { AutoComplete } from '../components/ui/AutoComplete'
import { RangePicker } from '../components/ui/DatePicker'

// ─── Field control binding ──────────────────────────────────────────────
// A plain control element dropped into <Field> must be wired to the form
// (value injected, change committed). Regression guard for the form demos
// where Switch / Slider / RadioGroup / Rate stayed unbound.

describe('Field — plain control binding', () => {
  it('commits a Switch toggle via valuePropName="checked"', async () => {
    const onSubmit = vi.fn()
    render(
      <Form defaultValues={{ on: false }} onSubmit={onSubmit}>
        <Field name="on" label="On" valuePropName="checked">
          <Switch />
        </Field>
        <SubmitButton>Save</SubmitButton>
      </Form>,
    )

    fireEvent.click(screen.getByRole('switch'))
    fireEvent.click(screen.getByText('Save'))

    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ on: true })
  })

  it('clears the required error after a RadioGroup choice', async () => {
    render(
      <Form defaultValues={{ plan: '' }} onSubmit={vi.fn()}>
        <Field name="plan" label="Plan" rules={[{ required: true, message: 'Pick a plan' }]}>
          <RadioGroup
            options={[
              { label: 'Hobby', value: 'hobby' },
              { label: 'Pro', value: 'pro' },
            ]}
          />
        </Field>
        <SubmitButton>Continue</SubmitButton>
      </Form>,
    )

    // Submitting empty surfaces the error.
    fireEvent.click(screen.getByText('Continue'))
    await waitFor(() => expect(screen.getByText('Pick a plan')).toBeTruthy())

    // Choosing an option must clear it (change-mode revalidation).
    fireEvent.click(screen.getByRole('radio', { name: 'Pro' }))
    await waitFor(() => expect(screen.queryByText('Pick a plan')).toBeNull())
  })

  it('clears a Rate validator error once a rating is given', async () => {
    render(
      <Form defaultValues={{ rating: 0 }} onSubmit={vi.fn()}>
        <Field
          name="rating"
          label="Rating"
          rules={[{ validator: (v) => (typeof v === 'number' && v > 0 ? null : 'Required') }]}
        >
          <Rate />
        </Field>
        <SubmitButton>Send</SubmitButton>
      </Form>,
    )

    fireEvent.click(screen.getByText('Send'))
    await waitFor(() => expect(screen.getByText('Required')).toBeTruthy())

    // Rate renders one clickable star per unit; click the last to set max.
    const stars = document.querySelectorAll('.sg-rate-star')
    expect(stars.length).toBeGreaterThan(0)
    fireEvent.click(stars[stars.length - 1])
    await waitFor(() => expect(screen.queryByText('Required')).toBeNull())
  })

  it('commits a Slider value', async () => {
    const onSubmit = vi.fn()
    render(
      <Form defaultValues={{ volume: 50 }} onSubmit={onSubmit}>
        <Field name="volume" label="Volume">
          <Slider min={0} max={100} />
        </Field>
        <SubmitButton>Save</SubmitButton>
      </Form>,
    )

    // The slider is keyboard-operable; ArrowRight bumps the value.
    const slider = document.querySelector('[role="slider"]') as HTMLElement
    expect(slider).toBeTruthy()
    slider.focus()
    fireEvent.keyDown(slider, { key: 'ArrowRight' })
    fireEvent.click(screen.getByText('Save'))

    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect((onSubmit.mock.calls[0][0] as { volume: number }).volume).toBeGreaterThan(50)
  })
})

// ─── AutoComplete async loading ──────────────────────────────────────────
// The input must stay enabled (and keep focus) while `loading` is true.

describe('AutoComplete — loading does not disable the input', () => {
  it('keeps the input enabled while loading', () => {
    render(<AutoComplete options={[]} loading placeholder="Search" />)
    const input = screen.getByRole('combobox') as HTMLInputElement
    expect(input.disabled).toBe(false)
    expect(input.getAttribute('aria-busy')).toBe('true')
  })
})

// ─── RangePicker start date ───────────────────────────────────────────────
// Controlled RangePicker must persist the first (start) click, not drop it.

describe('RangePicker — controlled start date persists', () => {
  function ControlledRange() {
    const [range, setRange] = React.useState<[Date | null, Date | null]>([null, null])
    return (
      <div>
        <RangePicker value={range} onChange={(r) => setRange(r)} />
        <span data-testid="start">{range[0] ? range[0].getDate() : 'none'}</span>
        <span data-testid="end">{range[1] ? range[1].getDate() : 'none'}</span>
      </div>
    )
  }

  it('fills both ends after picking start then end', async () => {
    render(<ControlledRange />)
    // Open the dropdown.
    fireEvent.click(document.querySelector('.sg-datepicker-range-part') as HTMLElement)

    const cells = () =>
      Array.from(document.querySelectorAll('.sg-dp-cell')).filter(
        (c) => !c.classList.contains('sg-dp-cell-outside'),
      ) as HTMLElement[]

    const inMonth = cells()
    expect(inMonth.length).toBeGreaterThan(15)
    // Pick start (10th in-month cell) then a later end (15th).
    fireEvent.click(inMonth[9])
    fireEvent.click(cells()[14])

    await waitFor(() => {
      expect(screen.getByTestId('start').textContent).not.toBe('none')
      expect(screen.getByTestId('end').textContent).not.toBe('none')
    })
  })
})
