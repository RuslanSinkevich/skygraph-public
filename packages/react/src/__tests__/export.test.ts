import { describe, it, expect } from 'vitest'
import { toCSVString, toTSVString } from '../components/complex/Table/export'

describe('toCSVString', () => {
  it('formats simple data', () => {
    const data = [
      ['Name', 'Age'],
      ['Alice', '30'],
      ['Bob', '25'],
    ]
    expect(toCSVString(data)).toBe('Name,Age\nAlice,30\nBob,25')
  })

  it('escapes commas in values', () => {
    const data = [['Name'], ['Doe, John']]
    expect(toCSVString(data)).toBe('Name\n"Doe, John"')
  })

  it('escapes double quotes', () => {
    const data = [['Quote'], ['He said "hello"']]
    expect(toCSVString(data)).toBe('Quote\n"He said ""hello"""')
  })

  it('escapes newlines', () => {
    const data = [['Text'], ['Line1\nLine2']]
    expect(toCSVString(data)).toBe('Text\n"Line1\nLine2"')
  })
})

describe('toTSVString', () => {
  it('uses tabs as separators', () => {
    const data = [
      ['Name', 'Age'],
      ['Alice', '30'],
    ]
    expect(toTSVString(data)).toBe('Name\tAge\nAlice\t30')
  })
})
