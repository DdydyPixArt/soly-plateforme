import { useState, useCallback } from "react";
import { Upload, File, CheckCircle, X, CloudUpload } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface UploadedFile {
  name: string;
  size: string;
  status: "uploading" | "success";
  progress: number;
}

export default function DocumentsPage() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const addFile = useCallback((name: string, size: number) => {
    const sizeStr = size < 1024 * 1024
      ? `${Math.round(size / 1024)} Ko`
      : `${(size / (1024 * 1024)).toFixed(1)} Mo`;
    const newFile: UploadedFile = { name, size: sizeStr, status: "uploading", progress: 0 };
    setFiles(prev => [...prev, newFile]);
    // Simulate upload progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += 20 + Math.random() * 30;
      if (progress >= 100) {
        clearInterval(interval);
        setFiles(prev => prev.map(f => f.name === name ? { ...f, status: "success", progress: 100 } : f));
      } else {
        setFiles(prev => prev.map(f => f.name === name ? { ...f, progress } : f));
      }
    }, 300);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    Array.from(e.dataTransfer.files).forEach(f => addFile(f.name, f.size));
  }, [addFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      Array.from(e.target.files).forEach(f => addFile(f.name, f.size));
    }
  }, [addFile]);

  const documentTypes = [
    "Pièce d'identité (CNI/Passeport)",
    "3 derniers bulletins de salaire",
    "2 derniers avis d'imposition",
    "Relevés de compte (3 mois)",
    "Justificatif de domicile",
    "Compromis de vente / Devis",
  ];

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Ingestion documentaire</h1>
        <p className="text-slate-500 text-sm mt-1">Téléversement sécurisé vers le Data Lake souverain</p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-4">
          {/* Drop zone */}
          <div
            data-testid="dropzone"
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer ${
              isDragging ? "border-[hsl(345,65%,28%)] bg-[hsl(345,65%,28%)]/5" : "border-slate-300 hover:border-slate-400 hover:bg-slate-50"
            }`}
          >
            <input
              type="file"
              multiple
              className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={handleFileInput}
              data-testid="input-file"
            />
            <CloudUpload size={40} className={`mx-auto mb-4 ${isDragging ? "text-[hsl(345,65%,28%)]" : "text-slate-300"}`} />
            <p className="font-semibold text-slate-700">Glisser-déposer les documents ici</p>
            <p className="text-sm text-slate-400 mt-1">ou cliquer pour parcourir</p>
            <p className="text-xs text-slate-300 mt-3">PDF, JPG, PNG — max 20 Mo par fichier</p>
          </div>

          {/* Files list */}
          {files.length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-sm font-semibold text-slate-700">Documents téléversés</CardTitle>
              </CardHeader>
              <CardContent className="divide-y divide-slate-100 p-0">
                {files.map((f, i) => (
                  <div key={i} data-testid={`file-item-${i}`} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <File size={14} className="text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{f.name}</p>
                      <p className="text-xs text-slate-400">{f.size}</p>
                      {f.status === "uploading" && (
                        <div className="mt-1.5 h-1 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[hsl(345,65%,28%)] rounded-full transition-all"
                            style={{ width: `${f.progress}%` }}
                          />
                        </div>
                      )}
                    </div>
                    {f.status === "success" ? (
                      <CheckCircle size={18} className="text-emerald-500 flex-shrink-0" />
                    ) : (
                      <span className="text-xs text-slate-400">{Math.round(f.progress)}%</span>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Required documents */}
        <Card className="border-0 shadow-sm h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-700">Documents requis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {documentTypes.map((doc, i) => {
              const uploaded = files.some(f => f.status === "success" && i < files.length);
              return (
                <div key={doc} className="flex items-start gap-2.5">
                  <div className={`w-4 h-4 rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center border ${
                    uploaded ? "bg-emerald-500 border-emerald-500" : "border-slate-300"
                  }`}>
                    {uploaded && <CheckCircle size={10} className="text-white" />}
                  </div>
                  <p className={`text-xs ${uploaded ? "text-slate-500" : "text-slate-600"}`}>{doc}</p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
