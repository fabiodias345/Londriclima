export const accessLayoutModule = { view: "tecnicos" };
export const accessLayoutRoot = `

function setupAccessLayout() {
  const view = document.querySelector("#tecnicosView");
  const list = document.querySelector("#tecnicosList");
  const formPanel = document.querySelector("#tecnicoFormPanel");
  const invitePanel = document.querySelector("#technicianInvitePanel");
  const form = document.querySelector("#tecnicoForm");
  const role = form?.elements?.role;
  const chefe = form?.elements?.tecnico_chefe;
  if (!view || !list || !formPanel || !invitePanel || view.dataset.accessLayoutReady === "true") return;

  view.dataset.accessLayoutReady = "true";
  const layout = document.createElement("div");
  layout.className = "access-layout";
  const listPanel = document.createElement("section");
  listPanel.className = "access-list-panel";
  const editorPanel = document.createElement("aside");
  editorPanel.className = "access-editor-panel";
  listPanel.appendChild(list);
  editorPanel.append(formPanel, invitePanel);
  layout.append(listPanel, editorPanel);
  view.appendChild(layout);

  if (role && !role.querySelector("option[value='tecnico_chefe']")) {
    const option = document.createElement("option");
    option.value = "tecnico_chefe";
    option.textContent = "Tecnico chefe";
    role.appendChild(option);
  }
  chefe?.closest("label")?.classList.add("access-chief-legacy-field");
  form?.addEventListener("submit", () => {
    if (role?.value !== "tecnico_chefe") return;
    role.value = "tecnico";
    if (chefe) chefe.checked = true;
  }, true);
  if (typeof resetTecnicoForm === "function" && typeof openAccessPanel === "function") {
    resetTecnicoForm();
    openAccessPanel("form");
  }
}

setupAccessLayout();
`;
