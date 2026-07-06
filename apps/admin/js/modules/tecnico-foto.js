export const tecnicoFotoModule = {
  view: "tecnico-foto",
  summaryId: "tecnicoFormStatus",
  viewId: "tecnicoFormPanel"
};

export const tecnicoFotoRoot = `
function instalarTrocaFotoTecnico() {
  if (!(tecnicoForm instanceof HTMLFormElement)) return;
  const actions = tecnicoForm.querySelector(".form-actions");
  if (!actions || tecnicoForm.querySelector("[data-tecnico-foto]")) return;

  const field = document.createElement("label");
  field.dataset.tecnicoFoto = "true";
  field.textContent = "Foto do tecnico";
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/jpeg,image/png,image/webp";
  const button = document.createElement("button");
  button.type = "button";
  button.className = "secondary-button";
  button.textContent = "Trocar foto";
  field.append(input, button);
  actions.before(field);

  button.addEventListener("click", async () => {
    const tecnicoId = String(tecnicoForm.elements.id.value || "");
    const file = input.files?.[0];
    if (!tecnicoId) {
      tecnicoFormStatus.textContent = "Selecione um acesso existente para trocar a foto.";
      return;
    }
    if (!file) {
      tecnicoFormStatus.textContent = "Selecione uma foto.";
      return;
    }

    button.disabled = true;
    tecnicoFormStatus.textContent = "Enviando foto...";
    try {
      const foto = await normalizarFotoTecnico(file);
      const body = new FormData();
      body.append("foto", foto, "foto.jpg");
      const response = await fetch(\`\${apiBaseUrl}/admin/tecnicos/\${tecnicoId}/foto\`, {
        method: "PATCH",
        headers: authHeaders(),
        body
      });
      if (await handleUnauthorized(response)) return;
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        tecnicoFormStatus.textContent = error.message || "Nao foi possivel trocar a foto.";
        return;
      }
      input.value = "";
      await loadTecnicos();
      tecnicoFormStatus.textContent = "Foto atualizada.";
    } catch {
      tecnicoFormStatus.textContent = "Nao foi possivel processar a foto.";
    } finally {
      button.disabled = false;
    }
  });
}

async function normalizarFotoTecnico(file) {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const limite = 1600;
  const escala = Math.min(1, limite / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * escala));
  const height = Math.max(1, Math.round(bitmap.height * escala));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.fillStyle = "#fff";
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Falha ao converter foto.")), "image/jpeg", 0.9);
  });
}

instalarTrocaFotoTecnico();
`;
