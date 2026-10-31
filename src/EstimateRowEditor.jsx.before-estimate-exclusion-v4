import { useEffect, useRef, useState, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import './EstimateRowEditor.css'

export default function EstimateRowEditor({ value, onClose, onSave, onReset }) {
  /* M-CROSS_ESTIMATE_EDITOR_MOBILE_SCROLL_V1_SAFE */
  /* M-CROSS_ESTIMATE_EDITOR_VIEWPORT_V2_SAFE */
  const [form, setForm] = useState(value)
  const panelRef = useRef(null)

  useEffect(() => {
    setForm(value)
    if (!value) return

    const frame = window.requestAnimationFrame(() => {
      panelRef.current?.scrollTo({ top: 0, behavior: 'auto' })
      window.scrollTo({ top: window.scrollY, behavior: 'auto' })
    })

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      window.cancelAnimationFrame(frame)
      document.body.style.overflow = previousOverflow
    }
  }, [value])
  /* M-CROSS_ESTIMATE_EDITOR_PORTAL_V3_SAFE */
  useLayoutEffect(() => {
    if (!form) return
    const resetToTop = () => {
      if (!panelRef.current) return
      panelRef.current.scrollTop = 0
      panelRef.current.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    }
    resetToTop()
    const frame1 = window.requestAnimationFrame(() => {
      resetToTop()
      window.requestAnimationFrame(resetToTop)
    })
    const timer = window.setTimeout(resetToTop, 80)
    return () => {
      window.cancelAnimationFrame(frame1)
      window.clearTimeout(timer)
    }
  }, [form?.key])

  if (!form) return null
  const setField = (field, next) => setForm(previous => ({ ...previous, [field]: next }))
  const setPart = (index, next) => setForm(previous => ({
    ...previous,
    parts: previous.parts.map((value, partIndex) => partIndex === index ? next : value),
  }))
  return createPortal(
    <div className="estimateEditorBackdrop" onClick={onClose}>
      <section ref={panelRef} className="estimateEditorPanel" role="dialog" aria-modal="true" aria-label="見積明細を編集" onClick={event => event.stopPropagation()}>
        <div className="estimateEditorHeader">
          <div><strong>見積明細を編集</strong><small>採寸データは変更せず、見積だけ変更します</small></div>
          <button type="button" onClick={onClose} aria-label="閉じる">×</button>
        </div>
        <div className="estimateEditorGrid">
          {form.parts.map((part, index) => <label key={index}><span>項目{index + 1}</span><input value={part} onChange={event => setPart(index, event.target.value)} /></label>)}
          <label className="wide"><span>メモ・仕様</span><input value={form.memo} onChange={event => setField('memo', event.target.value)} /></label>
          <label><span>数量</span><input inputMode="decimal" value={form.quantity} onChange={event => setField('quantity', event.target.value)} /></label>
          <label><span>単位</span><input value={form.unit} onChange={event => setField('unit', event.target.value)} /></label>
          <label><span>単価</span><input inputMode="numeric" value={form.rate} onChange={event => setField('rate', event.target.value)} /></label>
          <label><span>金額</span><input inputMode="numeric" value={form.amount} onChange={event => setField('amount', event.target.value)} placeholder="空欄なら数量×単価" /></label>
        </div>
        <div className="estimateEditorActions">
          <button type="button" className="secondaryButton" onClick={() => onReset(form.key)}>元に戻す</button>
          <button type="button" className="primary" onClick={() => onSave(form)}>変更を保存</button>
        </div>
      </section>
    </div>
  , document.body)
}
