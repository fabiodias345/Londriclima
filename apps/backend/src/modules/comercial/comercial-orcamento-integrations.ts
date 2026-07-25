export type OrcamentoDocumento = {
  filename: string;
  content: Buffer;
  contentType: "application/pdf";
};

export type OrcamentoAssinaturaResult = {
  documentId: string;
  assignmentId: string;
  status: string;
  evento: Record<string, unknown>;
};
