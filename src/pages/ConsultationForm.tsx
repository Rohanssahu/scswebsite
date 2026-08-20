import React, { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Loader2 } from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import TurnstileWidget, { TurnstileWidgetHandle } from "../components/forms/TurnstileWidget";
import HoneypotField from "../components/forms/HoneypotField";
import { validateConsultationForm, FieldErrors } from "@/lib/leadValidation";
import { buildConsultationRequest, submitLead, LeadSubmissionError } from "@/services/leadService";
import { isLeadCaptureReady } from "@/services/supabaseClient";
import type { LeadProjectMode, PreferredContactMethod } from "@/types/leads";

const inputClass = "w-full p-3 border rounded";
const labelClass = "block mb-1 font-medium";
const errorClass = "mt-1 text-sm text-red-600";

const SERVICES = [
  "web-development",
  "mobile-development",
  "digital-marketing",
  "ui-ux-design",
  "cloud-solutions",
  "devops-services",
] as const;

const BUDGET_RANGES = ["Under $1,000", "$1,000 – $5,000", "$5,000 – $15,000", "$15,000 – $50,000", "$50,000+"];
const TIMELINES = ["ASAP", "Within 1 month", "1–3 months", "3–6 months", "Flexible"];

interface FormState {
  name: string;
  email: string;
  phone: string;
  company: string;
  projectMode: string;
  service: string;
  requirement: string;
  budgetRange: string;
  timeline: string;
  contactMethod: string;
  consent: boolean;
}

const emptyForm: FormState = {
  name: "",
  email: "",
  phone: "",
  company: "",
  projectMode: "",
  service: "",
  requirement: "",
  budgetRange: "",
  timeline: "",
  contactMethod: "",
  consent: false,
};

const ConsultationForm = () => {
  const { t, i18n } = useTranslation();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [honeypot, setHoneypot] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileWidgetHandle>(null);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ name: string; referenceCode: string } | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const fieldError = (key: string) => (errors[key] ? t(errors[key]) : null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return; // duplicate-click guard
    setSubmitError(null);

    const nextErrors = validateConsultationForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    if (!isLeadCaptureReady) {
      setSubmitError(t("leadForm.unavailable"));
      return;
    }
    if (!turnstileToken) {
      setSubmitError(t("leadForm.turnstileRequired"));
      return;
    }

    setLoading(true);
    try {
      const request = buildConsultationRequest(
        {
          name: form.name,
          email: form.email,
          phone: form.phone,
          company: form.company,
          projectMode: form.projectMode as LeadProjectMode,
          service: form.service,
          requirement: form.requirement,
          budgetRange: form.budgetRange,
          timeline: form.timeline,
          contactMethod: form.contactMethod as PreferredContactMethod,
        },
        turnstileToken,
        { route: "/consultation-form", language: i18n.language },
        honeypot,
      );
      const result = await submitLead(request);
      setSuccess({ name: form.name.trim(), referenceCode: result.referenceCode });
      setForm(emptyForm);
    } catch (err) {
      const message =
        err instanceof LeadSubmissionError
          ? err.code === "rate_limited"
            ? t("leadForm.rateLimited")
            : err.code === "turnstile_failed"
              ? t("leadForm.turnstileRequired")
              : err.code === "not_configured"
                ? t("leadForm.unavailable")
                : err.message
          : t("leadForm.genericError");
      setSubmitError(message);
    } finally {
      // Tokens are single-use — always ask for a fresh check.
      turnstileRef.current?.reset();
      setTurnstileToken(null);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <section className="min-h-screen bg-gray-50 py-10 px-6 md:px-20">
        <div className="bg-white shadow-md rounded-lg max-w-2xl mx-auto p-6">
          {success ? (
            <div className="text-center py-8" role="status">
              <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" aria-hidden="true" />
              <h2 className="mt-4 text-2xl font-bold">{t("consultation.successTitle")}</h2>
              <p className="mt-3 text-gray-600">{t("consultation.successBody", { name: success.name })}</p>
              <p className="mt-4 text-sm text-gray-500">
                {t("consultation.referenceLabel")}:{" "}
                <span className="font-mono font-semibold text-gray-900">{success.referenceCode}</span>
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  to="/"
                  className="rounded-xl bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600 px-6 py-3 text-sm font-semibold text-white"
                >
                  {t("consultation.returnHome")}
                </Link>
                <a
                  href="https://wa.me/917828690192"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-white"
                >
                  {t("consultation.openWhatsApp")}
                </a>
                <Link
                  to="/products"
                  className="rounded-xl border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-700"
                >
                  {t("consultation.continueExploring")}
                </Link>
              </div>
            </div>
          ) : (
            <>
              <h2 className="text-3xl font-bold text-center mb-6">{t("consultation.title")}</h2>

              {!isLeadCaptureReady && (
                <p role="alert" className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  {t("leadForm.unavailable")}
                </p>
              )}

              <form className="space-y-6" onSubmit={handleSubmit} noValidate>
                <HoneypotField value={honeypot} onChange={setHoneypot} />

                <div>
                  <label htmlFor="c-name" className={labelClass}>{t("consultation.fullName")}</label>
                  <input
                    id="c-name"
                    type="text"
                    className={inputClass}
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    required
                    aria-invalid={Boolean(errors.name)}
                    aria-describedby={errors.name ? "c-name-error" : undefined}
                  />
                  {fieldError("name") && <p id="c-name-error" role="alert" className={errorClass}>{fieldError("name")}</p>}
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label htmlFor="c-email" className={labelClass}>{t("consultation.email")}</label>
                    <input
                      id="c-email"
                      type="email"
                      className={inputClass}
                      value={form.email}
                      onChange={(e) => set("email", e.target.value)}
                      required
                      aria-invalid={Boolean(errors.email)}
                      aria-describedby={errors.email ? "c-email-error" : undefined}
                    />
                    {fieldError("email") && <p id="c-email-error" role="alert" className={errorClass}>{fieldError("email")}</p>}
                  </div>
                  <div>
                    <label htmlFor="c-phone" className={labelClass}>{t("consultation.phone")}</label>
                    <input
                      id="c-phone"
                      type="tel"
                      className={inputClass}
                      value={form.phone}
                      onChange={(e) => set("phone", e.target.value)}
                      required
                      aria-invalid={Boolean(errors.phone)}
                      aria-describedby={errors.phone ? "c-phone-error" : undefined}
                    />
                    {fieldError("phone") && <p id="c-phone-error" role="alert" className={errorClass}>{fieldError("phone")}</p>}
                  </div>
                </div>

                <div>
                  <label htmlFor="c-company" className={labelClass}>{t("consultation.company")}</label>
                  <input
                    id="c-company"
                    type="text"
                    className={inputClass}
                    value={form.company}
                    onChange={(e) => set("company", e.target.value)}
                    aria-invalid={Boolean(errors.company)}
                    aria-describedby={errors.company ? "c-company-error" : undefined}
                  />
                  {fieldError("company") && <p id="c-company-error" role="alert" className={errorClass}>{fieldError("company")}</p>}
                </div>

                <fieldset>
                  <legend className={labelClass}>{t("consultation.projectMode")}</legend>
                  <div className="flex gap-6">
                    {(["new", "existing"] as const).map((mode) => (
                      <label key={mode} className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name="projectMode"
                          value={mode}
                          checked={form.projectMode === mode}
                          onChange={() => set("projectMode", mode)}
                        />
                        {mode === "new" ? t("consultation.modeNew") : t("consultation.modeExisting")}
                      </label>
                    ))}
                  </div>
                  {fieldError("projectMode") && <p role="alert" className={errorClass}>{fieldError("projectMode")}</p>}
                </fieldset>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label htmlFor="c-service" className={labelClass}>{t("consultation.service")}</label>
                    <select
                      id="c-service"
                      className={inputClass}
                      value={form.service}
                      onChange={(e) => set("service", e.target.value)}
                      required
                      aria-invalid={Boolean(errors.service)}
                      aria-describedby={errors.service ? "c-service-error" : undefined}
                    >
                      <option value="">{t("consultation.selectService")}</option>
                      {SERVICES.map((s) => (
                        <option key={s} value={s}>
                          {t(`services.names.${s === "mobile-development" ? "mobile-app-development" : s}`)}
                        </option>
                      ))}
                    </select>
                    {fieldError("service") && <p id="c-service-error" role="alert" className={errorClass}>{fieldError("service")}</p>}
                  </div>
                  <div>
                    <label htmlFor="c-method" className={labelClass}>{t("consultation.contactMethod")}</label>
                    <select
                      id="c-method"
                      className={inputClass}
                      value={form.contactMethod}
                      onChange={(e) => set("contactMethod", e.target.value)}
                      required
                      aria-invalid={Boolean(errors.contactMethod)}
                      aria-describedby={errors.contactMethod ? "c-method-error" : undefined}
                    >
                      <option value="">—</option>
                      <option value="email">{t("consultation.contactEmail")}</option>
                      <option value="phone">{t("consultation.contactPhone")}</option>
                      <option value="whatsapp">{t("consultation.contactWhatsapp")}</option>
                    </select>
                    {fieldError("contactMethod") && <p id="c-method-error" role="alert" className={errorClass}>{fieldError("contactMethod")}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label htmlFor="c-budget" className={labelClass}>{t("consultation.budget")}</label>
                    <select
                      id="c-budget"
                      className={inputClass}
                      value={form.budgetRange}
                      onChange={(e) => set("budgetRange", e.target.value)}
                      required
                      aria-invalid={Boolean(errors.budgetRange)}
                      aria-describedby={errors.budgetRange ? "c-budget-error" : undefined}
                    >
                      <option value="">{t("consultation.selectBudget")}</option>
                      {BUDGET_RANGES.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                    {fieldError("budgetRange") && <p id="c-budget-error" role="alert" className={errorClass}>{fieldError("budgetRange")}</p>}
                  </div>
                  <div>
                    <label htmlFor="c-timeline" className={labelClass}>{t("consultation.timeline")}</label>
                    <select
                      id="c-timeline"
                      className={inputClass}
                      value={form.timeline}
                      onChange={(e) => set("timeline", e.target.value)}
                      required
                      aria-invalid={Boolean(errors.timeline)}
                      aria-describedby={errors.timeline ? "c-timeline-error" : undefined}
                    >
                      <option value="">{t("consultation.selectTimeline")}</option>
                      {TIMELINES.map((tl) => (
                        <option key={tl} value={tl}>{tl}</option>
                      ))}
                    </select>
                    {fieldError("timeline") && <p id="c-timeline-error" role="alert" className={errorClass}>{fieldError("timeline")}</p>}
                  </div>
                </div>

                <div>
                  <label htmlFor="c-brief" className={labelClass}>{t("consultation.projectBrief")}</label>
                  <textarea
                    id="c-brief"
                    className={inputClass}
                    rows={4}
                    value={form.requirement}
                    onChange={(e) => set("requirement", e.target.value)}
                    required
                    placeholder={t("consultation.briefPlaceholder")}
                    aria-invalid={Boolean(errors.requirement)}
                    aria-describedby={errors.requirement ? "c-brief-error" : undefined}
                  />
                  {fieldError("requirement") && <p id="c-brief-error" role="alert" className={errorClass}>{fieldError("requirement")}</p>}
                </div>

                <div>
                  <label className="flex items-start gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={form.consent}
                      onChange={(e) => set("consent", e.target.checked)}
                      aria-invalid={Boolean(errors.consent)}
                      aria-describedby={errors.consent ? "c-consent-error" : undefined}
                    />
                    {t("leadForm.consentLabel")}
                  </label>
                  {fieldError("consent") && <p id="c-consent-error" role="alert" className={errorClass}>{fieldError("consent")}</p>}
                </div>

                {isLeadCaptureReady && (
                  <TurnstileWidget ref={turnstileRef} onToken={setTurnstileToken} key={i18n.language} />
                )}

                {submitError && (
                  <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {submitError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading || !isLeadCaptureReady}
                  className="bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600 text-white px-6 py-3 rounded font-semibold hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60 inline-flex items-center gap-2"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                  {loading ? t("common.sending") : t("consultation.submitRequest")}
                </button>
              </form>
            </>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default ConsultationForm;
