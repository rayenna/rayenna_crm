import type { CustomerContactEntry } from '../../utils/customContacts'
import { emptyCustomerContact, formatContactPersonName } from '../../utils/customContacts'

type Props = {
  contacts: CustomerContactEntry[]
  onChange: (contacts: CustomerContactEntry[]) => void
  readOnly?: boolean
  inputCls: string
  labelCls: string
  selectCls: string
}

export function CustomerContactsEditor({
  contacts,
  onChange,
  readOnly = false,
  inputCls,
  labelCls,
  selectCls,
}: Props) {
  const updateContact = (index: number, patch: Partial<CustomerContactEntry>) => {
    const next = contacts.map((c, i) => (i === index ? { ...c, ...patch } : c))
    onChange(next)
  }

  const updateListItem = (
    index: number,
    field: 'phones' | 'emails',
    listIndex: number,
    value: string,
  ) => {
    const list = [...contacts[index][field]]
    list[listIndex] = value
    updateContact(index, { [field]: list })
  }

  const addListItem = (index: number, field: 'phones' | 'emails') => {
    updateContact(index, { [field]: [...contacts[index][field], ''] })
  }

  const removeListItem = (index: number, field: 'phones' | 'emails', listIndex: number) => {
    const list = contacts[index][field].filter((_, i) => i !== listIndex)
    updateContact(index, { [field]: list.length > 0 ? list : [''] })
  }

  const addContact = () => onChange([...contacts, emptyCustomerContact()])

  const removeContact = (index: number) => {
    if (contacts.length <= 1) return
    onChange(contacts.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-4">
      {contacts.map((contact, index) => (
        <div
          key={index}
          className="rounded-2xl border border-[color:var(--border-default)] bg-[color:var(--bg-input)]/40 p-4 sm:p-5"
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-extrabold uppercase tracking-wider text-[color:var(--text-secondary)]">
              Contact {index + 1}
              {formatContactPersonName(contact) ? (
                <span className="ml-2 font-semibold normal-case text-[color:var(--text-primary)]">
                  — {formatContactPersonName(contact)}
                </span>
              ) : null}
            </p>
            {!readOnly && contacts.length > 1 ? (
              <button
                type="button"
                onClick={() => removeContact(index)}
                className="min-h-[36px] touch-manipulation rounded-xl border border-[color:var(--accent-red-border)] bg-[color:var(--accent-red-muted)] px-3 py-1.5 text-xs font-bold text-[color:var(--accent-red)]"
              >
                Remove contact
              </button>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className={labelCls}>Prefix</label>
              <select
                value={contact.prefix}
                disabled={readOnly}
                onChange={(e) => updateContact(index, { prefix: e.target.value })}
                className={selectCls}
              >
                <option value="">None</option>
                <option value="Mr.">Mr.</option>
                <option value="Ms.">Ms.</option>
                <option value="Mrs.">Mrs.</option>
                <option value="Miss">Miss</option>
                <option value="Mx.">Mx.</option>
                <option value="Dr.">Dr.</option>
                <option value="Prof.">Prof.</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>
                First name
              </label>
              <input
                type="text"
                value={contact.firstName}
                disabled={readOnly}
                onChange={(e) => updateContact(index, { firstName: e.target.value })}
                className={inputCls}
                placeholder="First name"
              />
            </div>
            <div>
              <label className={labelCls}>Middle name</label>
              <input
                type="text"
                value={contact.middleName}
                disabled={readOnly}
                onChange={(e) => updateContact(index, { middleName: e.target.value })}
                className={inputCls}
                placeholder="Middle name"
              />
            </div>
            <div>
              <label className={labelCls}>Last name</label>
              <input
                type="text"
                value={contact.lastName}
                disabled={readOnly}
                onChange={(e) => updateContact(index, { lastName: e.target.value })}
                className={inputCls}
                placeholder="Last name"
              />
            </div>
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <label className={labelCls}>
                Phone numbers <span className="normal-case font-normal text-red-500">*</span>
              </label>
              <div className="space-y-2">
                {contact.phones.map((phone, phoneIdx) => (
                  <div key={phoneIdx} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <input
                      type="text"
                      value={phone}
                      disabled={readOnly}
                      onChange={(e) => updateListItem(index, 'phones', phoneIdx, e.target.value)}
                      placeholder="Phone number"
                      className={`min-w-0 flex-1 ${inputCls}`}
                    />
                    {!readOnly && contact.phones.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => removeListItem(index, 'phones', phoneIdx)}
                        className="shrink-0 self-end min-h-[40px] touch-manipulation rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-card)] px-3 py-2 text-xs font-bold text-[color:var(--text-secondary)] hover:border-[color:var(--accent-red-border)] hover:text-[color:var(--accent-red)] sm:self-center"
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
              {!readOnly ? (
                <button
                  type="button"
                  onClick={() => addListItem(index, 'phones')}
                  className="mt-2 inline-flex min-h-[40px] touch-manipulation items-center gap-2 rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-card)] px-3 py-2 text-xs font-extrabold text-[color:var(--text-primary)]"
                >
                  <span className="text-[color:var(--accent-teal)]">＋</span>
                  Add phone
                </button>
              ) : null}
            </div>

            <div>
              <label className={labelCls}>E-mail IDs</label>
              <div className="space-y-2">
                {contact.emails.map((email, emailIdx) => (
                  <div key={emailIdx} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <input
                      type="email"
                      value={email}
                      disabled={readOnly}
                      onChange={(e) => updateListItem(index, 'emails', emailIdx, e.target.value)}
                      placeholder="example@email.com"
                      className={`min-w-0 flex-1 ${inputCls}`}
                    />
                    {!readOnly && contact.emails.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => removeListItem(index, 'emails', emailIdx)}
                        className="shrink-0 self-end min-h-[40px] touch-manipulation rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-card)] px-3 py-2 text-xs font-bold text-[color:var(--text-secondary)] hover:border-[color:var(--accent-red-border)] hover:text-[color:var(--accent-red)] sm:self-center"
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
              {!readOnly ? (
                <button
                  type="button"
                  onClick={() => addListItem(index, 'emails')}
                  className="mt-2 inline-flex min-h-[40px] touch-manipulation items-center gap-2 rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-card)] px-3 py-2 text-xs font-extrabold text-[color:var(--text-primary)]"
                >
                  <span className="text-[color:var(--accent-teal)]">＋</span>
                  Add e-mail
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ))}

      {!readOnly ? (
        <button
          type="button"
          onClick={addContact}
          className="inline-flex min-h-[44px] w-full touch-manipulation items-center justify-center gap-2 rounded-xl border border-dashed border-[color:var(--accent-teal-border)] bg-[color:var(--accent-teal-muted)]/30 px-4 py-3 text-sm font-extrabold text-[color:var(--accent-teal)] sm:w-auto"
        >
          <span>＋</span>
          Add another contact
        </button>
      ) : null}
    </div>
  )
}
