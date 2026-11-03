"use client";

import { useActionState, useEffect, useState } from "react";
import { uploadClientDocument } from "@/app/actions/portal";
import { initialFormState } from "@/lib/forms";
import { FormAlert, SubmitButton } from "@/components/forms";
import { Icon } from "@/components/Icon";

export function ClientUpload({ applicationId, signed = false }: { applicationId: string; signed?: boolean }) {
  const [state, action] = useActionState(uploadClientDocument, initialFormState);
  const [name, setName] = useState<string | null>(null);
  // Po wysłaniu formularz jest czyszczony – czyścimy też nazwę pliku
  useEffect(() => setName(null), [state]);
  return (
    <form action={action} className="form" style={{ gap: 16 }}>
      <input type="hidden" name="applicationId" value={applicationId} />
      {signed ? (
        <input type="hidden" name="kind" value="UMOWA_PODPISANA" />
      ) : (
        <div className="field">
          <label htmlFor="kind">Rodzaj dokumentu</label>
          <select id="kind" name="kind" className="select" defaultValue="FAKTURA">
            <option value="FAKTURA">Faktura za energię</option>
            <option value="PELNOMOCNICTWO">Pełnomocnictwo</option>
            <option value="UMOWA_PODPISANA">Podpisana umowa</option>
            <option value="INNE">Inny dokument</option>
          </select>
        </div>
      )}
      <label className="dropzone" style={{ padding: 20 }}>
        <input type="file" name="file" accept={signed ? "application/pdf" : "application/pdf,.xml,application/xml,text/xml,image/jpeg,image/png"} required onChange={(e) => setName(e.target.files?.[0]?.name ?? null)} />
        <Icon name="upload" size={26} />
        <strong>{name ?? (signed ? "Wybierz podpisaną umowę (PDF)" : "Wybierz plik")}</strong>
        <span className="hint">{signed ? "PDF do 10 MB" : "PDF, JPG lub PNG do 10 MB"}</span>
      </label>
      <FormAlert state={state} />
      <div>
        <SubmitButton className="btn" pending="Przesyłanie…" arrow={false}>
          <Icon name="upload" size={18} /> {signed ? "Prześlij podpisaną umowę" : "Dodaj dokument"}
        </SubmitButton>
      </div>
    </form>
  );
}
