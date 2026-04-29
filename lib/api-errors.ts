import { NextResponse } from "next/server";

// Devuelve un 400 con mensaje genérico al cliente y loguea el detalle real
// del lado del server. Usar para errores de PostgREST/DB cuyo `message`
// suele incluir nombre de constraints, columnas, valores duplicados, etc.
// que no queremos exponer en respuesta.
export function dbError(stage: string, err: { message?: string } | null | undefined) {
  const detail = err?.message ?? "(sin mensaje)";
  console.error(`[${stage}]`, detail);
  return NextResponse.json(
    { error: "No pudimos completar la operación" },
    { status: 400 }
  );
}
