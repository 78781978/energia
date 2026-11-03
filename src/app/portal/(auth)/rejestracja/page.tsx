import { redirect } from "next/navigation";

/** Rejestracja odbywa się w kreatorze zamówienia (etap 7) – stary adres przekierowuje do kreatora. */
export default function RegisterPage() {
  redirect("/portal/wniosek/");
}
