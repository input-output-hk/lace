export const getCompletionDate = (date?: string): string =>
  new Date(date || '')
    .toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })
    .replace(/(,)/g, '');

export const download = (path: string, filename: string) => {
  const anchor = document.createElement('a');
  anchor.href = path;
  anchor.download = filename;

  anchor.click();
};

export const handleDownloadCertificate = async (url: string, fileName: string) => {
  const options: RequestInit = {
    method: 'get',
    mode: 'no-cors',
    headers: {
      'Access-Control-Allow-Origin': '*'
    }
  };

  const pdfFile = await fetch(url, options);
  const pdfFileblob = await pdfFile.blob();

  const blob = new Blob([pdfFileblob], { type: 'application/pdf' });
  const urlCreator = window.URL;

  const pdfUrl = urlCreator.createObjectURL(blob);

  const formattedFileName = `${fileName.toLocaleLowerCase().replace(' /g', '-')}.pdf`;

  download(pdfUrl, formattedFileName);

  urlCreator.revokeObjectURL(pdfUrl);
};
