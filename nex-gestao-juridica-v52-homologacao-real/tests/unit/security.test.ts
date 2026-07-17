import { describe, expect, it } from "vitest";
import { constantTimeEqual, hashText, readJson, safeError } from "../../api/_shared/security";

describe("helpers de segurança", () => {
  it("compara segredos sem aceitar tamanhos ou valores diferentes", () => {
    expect(constantTimeEqual("segredo-forte", "segredo-forte")).toBe(true);
    expect(constantTimeEqual("segredo", "segredo-diferente")).toBe(false);
    expect(constantTimeEqual("", "segredo")).toBe(false);
  });

  it("produz hash determinístico sem devolver o texto original", () => {
    const result = hashText("chave-sensível");
    expect(result).toHaveLength(64);
    expect(result).toBe(hashText("chave-sensível"));
    expect(result).not.toContain("chave-sensível");
  });

  it("limita payloads JSON", async () => {
    const request = new Request("https://nex.local/api", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ texto: "x".repeat(200) }),
    });
    await expect(readJson(request, 32)).rejects.toMatchObject({ status: 413 });
  });

  it("não expõe detalhes de erro interno", () => {
    expect(safeError(new Error("SQL secreto"), "Operação segura")).toEqual({ status: 500, message: "Operação segura" });
    expect(safeError(Object.assign(new Error("Dados inválidos"), { status: 400 }))).toEqual({ status: 400, message: "Dados inválidos" });
  });
});
