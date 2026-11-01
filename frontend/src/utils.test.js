import { describe, expect, it } from 'vitest'
import { daysLabel, fillTemplate, fmtDate, initials, inr, waLink } from './utils'

describe('utils', () => {
  it('formats rupees the Indian way', () => {
    expect(inr(148200)).toBe('₹1,48,200')
    expect(inr(0)).toBe('₹0')
  })
  it('formats dates', () => {
    expect(fmtDate('2026-11-03')).toBe('3 Nov 2026')
    expect(fmtDate('2026-11-03', false)).toBe('3 Nov')
    expect(fmtDate(null)).toBe('—')
  })
  it('builds initials', () => {
    expect(initials('Priya Sundar')).toBe('PS')
    expect(initials('arun')).toBe('A')
  })
  it('fills template variables', () => {
    expect(fillTemplate('Hi {name}, ₹{amount} due', { name: 'Ravi', amount: '1,200' })).toBe('Hi Ravi, ₹1,200 due')
  })
  it('builds WhatsApp links with country code and encoded text', () => {
    expect(waLink('98765 43210', '91', 'Hi there')).toBe('https://wa.me/919876543210?text=Hi%20there')
    expect(waLink('+91 98765 43210')).toBe('https://wa.me/919876543210')
  })
  it('describes days', () => {
    expect(daysLabel(0)).toBe('Today')
    expect(daysLabel(1)).toBe('1 day')
    expect(daysLabel(-3)).toBe('3 days ago')
  })
})
