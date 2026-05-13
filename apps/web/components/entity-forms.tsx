"use client"

import { useState } from "react"
import { Modal, FormInput, FormSelect, FormTextarea, FormActions } from "@/components/modal"
import { useBusinessLine } from "@/components/business-line-context"

/* ============================================================
   LEAD NOU FORM
   ============================================================ */

export function NewLeadModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated?: () => void }) {
  const { activeLine } = useBusinessLine()
  const [form, setForm] = useState({
    companyName: "", contactPerson: "", email: "", phone: "",
    source: "", estimatedValue: "", priority: "medium", assignedTo: "", notes: "",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const set = (key: string) => (val: string) => setForm((p) => ({ ...p, [key]: val }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessLineSlug: activeLine?.id || 'agency',
          entityType: activeLine?.id === 'fudly' ? 'restaurants' : 'clients',
          companyName: form.companyName,
          contactPerson: form.contactPerson,
          email: form.email,
          phone: form.phone || null,
          source: form.source || null,
          value: form.estimatedValue ? parseFloat(form.estimatedValue) : null,
          priority: form.priority,
          assignedTo: form.assignedTo || null,
          notes: form.notes || null,
          status: 'nou',
        }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Eroare la salvare')
      }
      setForm({ companyName: "", contactPerson: "", email: "", phone: "", source: "", estimatedValue: "", priority: "medium", assignedTo: "", notes: "" })
      onCreated?.()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Eroare la creare lead')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Lead Nou" description="Adaugă un prospect nou în pipeline" size="lg">
      <form onSubmit={handleSubmit}>
        {error && <div className="mb-3 px-3 py-2 bg-destructive/10 border border-destructive/20 rounded-lg text-xs text-destructive">{error}</div>}
        <div className="grid grid-cols-2 gap-4">
          <FormInput label="Companie" id="lead-company" placeholder="ex: TechSoft SRL" value={form.companyName} onChange={set("companyName")} required half />
          <FormInput label="Persoană de Contact" id="lead-contact" placeholder="ex: Ion Popescu" value={form.contactPerson} onChange={set("contactPerson")} required half />
          <FormInput label="Email" id="lead-email" type="email" placeholder="contact@companie.ro" value={form.email} onChange={set("email")} required half />
          <FormInput label="Telefon" id="lead-phone" type="tel" placeholder="+40 7XX XXX XXX" value={form.phone} onChange={set("phone")} half />
          <FormSelect label="Sursă" id="lead-source" value={form.source} onChange={set("source")} required half options={[
            { value: "website", label: "Website" },
            { value: "referral", label: "Referral" },
            { value: "linkedin", label: "LinkedIn" },
            { value: "cold_outreach", label: "Cold Outreach" },
            { value: "google_ads", label: "Google Ads" },
          ]} />
          <FormInput label="Valoare Estimată (EUR)" id="lead-value" type="number" placeholder="ex: 3000" value={form.estimatedValue} onChange={set("estimatedValue")} required half />
          <FormSelect label="Prioritate" id="lead-priority" value={form.priority} onChange={set("priority")} required half options={[
            { value: "low", label: "Low" },
            { value: "medium", label: "Mediu" },
            { value: "high", label: "Ridicat" },
            { value: "urgent", label: "Urgent" },
          ]} />
          <FormSelect label="Asignat" id="lead-assigned" value={form.assignedTo} onChange={set("assignedTo")} required half options={[
            { value: "Alexandru", label: "Alexandru Stanescu" },
            { value: "Andrei", label: "Andrei Mihai" },
          ]} />
          <FormTextarea label="Note" id="lead-notes" placeholder="Detalii suplimentare despre lead..." value={form.notes} onChange={set("notes")} />
        </div>
        <FormActions onCancel={onClose} submitLabel={saving ? "Se salvează..." : "Adaugă Lead"} />
      </form>
    </Modal>
  )
}

/* ============================================================
   CLIENT NOU FORM
   ============================================================ */

export function NewClientModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState({
    companyName: "", cui: "", regCom: "", contactPerson: "", email: "", phone: "",
    industry: "", website: "", address: "", notes: "",
  })

  const set = (key: string) => (val: string) => setForm((p) => ({ ...p, [key]: val }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Client nou:", form)
    onClose()
    setForm({ companyName: "", cui: "", regCom: "", contactPerson: "", email: "", phone: "", industry: "", website: "", address: "", notes: "" })
  }

  return (
    <Modal open={open} onClose={onClose} title="Client Nou" description="Înregistrează un client nou în sistem" size="lg">
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-4">
          <FormInput label="Nume Companie" id="client-company" placeholder="ex: TechSoft SRL" value={form.companyName} onChange={set("companyName")} required half />
          <FormInput label="CUI" id="client-cui" placeholder="ex: RO12345678" value={form.cui} onChange={set("cui")} required half />
          <FormInput label="Reg. Com." id="client-regcom" placeholder="ex: J40/1234/2020" value={form.regCom} onChange={set("regCom")} half />
          <FormInput label="Industrie" id="client-industry" placeholder="ex: FoodTech & Delivery" value={form.industry} onChange={set("industry")} half />
          <FormInput label="Persoană Contact" id="client-contact" placeholder="ex: Ion Popescu" value={form.contactPerson} onChange={set("contactPerson")} required half />
          <FormInput label="Email" id="client-email" type="email" placeholder="contact@companie.ro" value={form.email} onChange={set("email")} required half />
          <FormInput label="Telefon" id="client-phone" type="tel" placeholder="+40 7XX XXX XXX" value={form.phone} onChange={set("phone")} half />
          <FormInput label="Website" id="client-website" placeholder="https://companie.ro" value={form.website} onChange={set("website")} half />
          <FormInput label="Adresă" id="client-address" placeholder="Str. Example 10, București" value={form.address} onChange={set("address")} half />
          <div className="col-span-1" />
          <FormTextarea label="Note" id="client-notes" placeholder="Note despre client..." value={form.notes} onChange={set("notes")} />
        </div>
        <FormActions onCancel={onClose} submitLabel="Creează Client" />
      </form>
    </Modal>
  )
}

/* ============================================================
   PROIECT NOU FORM
   ============================================================ */

export function NewProjectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState({
    name: "", clientId: "", type: "", startDate: "", deadline: "",
    budget: "", hoursEstimated: "", teamMembers: "", notes: "",
  })

  const set = (key: string) => (val: string) => setForm((p) => ({ ...p, [key]: val }))

  // Import clients for the dropdown
  const clientOptions = [
    { value: "cli-001", label: "QualityControl SRL" },
    { value: "cli-002", label: "Fudly Technologies SRL" },
    { value: "cli-003", label: "ClimaticPRO SRL" },
    { value: "cli-004", label: "WertAudit SRL" },
    { value: "cli-005", label: "Swiss Amanet SRL" },
    { value: "cli-006", label: "NordFinance Group SA" },
    { value: "cli-007", label: "Meridian Logistics SA" },
    { value: "cli-008", label: "Dental Excellence Group" },
    { value: "cli-009", label: "Carpathian Adventures SRL" },
  ]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Proiect nou:", form)
    onClose()
    setForm({ name: "", clientId: "", type: "", startDate: "", deadline: "", budget: "", hoursEstimated: "", teamMembers: "", notes: "" })
  }

  return (
    <Modal open={open} onClose={onClose} title="Proiect Nou" description="Creează un proiect nou și asignează-l unui client" size="lg">
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-4">
          <FormInput label="Nume Proiect" id="proj-name" placeholder="ex: Redesign Site..." value={form.name} onChange={set("name")} required half />
          <FormSelect label="Client" id="proj-client" value={form.clientId} onChange={set("clientId")} required half options={clientOptions} />
          <FormSelect label="Tip Proiect" id="proj-type" value={form.type} onChange={set("type")} required half options={[
            { value: "website", label: "Web Development" },
            { value: "seo", label: "SEO" },
            { value: "seo_programmatic", label: "SEO Programatic" },
            { value: "google_ads", label: "Google Ads" },
            { value: "mentenanta", label: "Mentenanță" },
            { value: "audit", label: "Audit & Consultanță" },
          ]} />
          <FormInput label="Buget (EUR)" id="proj-budget" type="number" placeholder="ex: 8000" value={form.budget} onChange={set("budget")} required half />
          <FormInput label="Data Start" id="proj-start" type="date" value={form.startDate} onChange={set("startDate")} required half />
          <FormInput label="Deadline" id="proj-deadline" type="date" value={form.deadline} onChange={set("deadline")} required half />
          <FormInput label="Ore Estimate" id="proj-hours" type="number" placeholder="ex: 120" value={form.hoursEstimated} onChange={set("hoursEstimated")} half />
          <FormSelect label="Echipă" id="proj-team" value={form.teamMembers} onChange={set("teamMembers")} half options={[
            { value: "Alexandru", label: "Alexandru Stanescu" },
            { value: "Andrei", label: "Andrei Mihai" },
            { value: "Maria", label: "Maria Ionescu" },
            { value: "Alexandru,Andrei", label: "Alexandru + Andrei" },
            { value: "Alexandru,Maria", label: "Alexandru + Maria" },
            { value: "Andrei,Alexandru,Maria", label: "Toată Echipa" },
          ]} />
          <FormTextarea label="Note" id="proj-notes" placeholder="Detalii suplimentare..." value={form.notes} onChange={set("notes")} />
        </div>
        <FormActions onCancel={onClose} submitLabel="Creează Proiect" />
      </form>
    </Modal>
  )
}
