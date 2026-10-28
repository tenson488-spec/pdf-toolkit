import { useRef, useState } from 'react'
import { PDFDocument, degrees } from 'pdf-lib'
import { ArrowDownToLine, ArrowLeft, CheckCircle2, FileImage, FilePlus2, Files, LockKeyhole, RotateCw, Scissors, ShieldCheck, Sparkles, UploadCloud, X } from 'lucide-react'
import './App.css'

const tools = [
  { id: 'merge', title: 'Merge PDF', description: 'Combine multiple PDF files into one document.', icon: Files, color: 'blue', accept: 'application/pdf,.pdf', multiple: true },
  { id: 'split', title: 'Split PDF', description: 'Extract selected pages into a new PDF.', icon: Scissors, color: 'purple', accept: 'application/pdf,.pdf', multiple: false },
  { id: 'rotate', title: 'Rotate PDF', description: 'Rotate every page of a PDF in one click.', icon: RotateCw, color: 'orange', accept: 'application/pdf,.pdf', multiple: false },
  { id: 'images', title: 'Images to PDF', description: 'Turn JPG and PNG images into a PDF.', icon: FileImage, color: 'green', accept: 'image/jpeg,image/png,.jpg,.jpeg,.png', multiple: true },
]

function saveFile(data, filename) {
  const blob = new Blob([data], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function parsePageRanges(input, pageCount) {
  if (!input.trim()) throw new Error('Enter page numbers, such as 1,3-5.')
  const selected = []
  for (const item of input.split(',')) {
    const token = item.trim()
    const match = /^(\d+)(?:\s*-\s*(\d+))?$/.exec(token)
    if (!match) throw new Error('Use page numbers like 1,3-5.')
    const start = Number(match[1])
    const end = match[2] ? Number(match[2]) : start
    if (start < 1 || end > pageCount || start > end) throw new Error(`Choose pages between 1 and ${pageCount}, in ascending ranges.`)
    for (let n = start; n <= end; n++) {
      if (!selected.includes(n - 1)) selected.push(n - 1)
    }
  }
  return selected
}

export default function App() {
  const [active, setActive] = useState(null)
  const [files, setFiles] = useState([])
  const [pages, setPages] = useState('1')
  const [angle, setAngle] = useState('90')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef(null)
  const current = tools.find(t => t.id === active)

  function openTool(id) {
    setActive(id)
    setFiles([])
    setPages('1')
    setAngle('90')
    setMessage('')
    setError('')
  }

  function addFiles(list) {
    if (!list?.length || !current) return
    const next = Array.from(list)
    const allowed = current.id === 'images'
      ? next.every(f => ['image/jpeg', 'image/png'].includes(f.type) || /\.(png|jpe?g)$/i.test(f.name))
      : next.every(f => f.type === 'application/pdf' || /\.pdf$/i.test(f.name))
    if (!allowed) { setError(current.id === 'images' ? 'Please choose only JPG or PNG images.' : 'Please choose only PDF files.'); return }
    setFiles(previous => current.multiple ? [...previous, ...next] : next.slice(0, 1))
    setMessage('')
    setError('')
    if (inputRef.current) inputRef.current.value = ''
  }

  async function processFiles() {
    if (!files.length) { setError('Choose at least one file first.'); return }
    if (active === 'merge' && files.length < 2) { setError('Choose at least two PDFs to merge.'); return }
    setBusy(true)
    setError('')
    setMessage('')
    try {
      let document
      let filename
      if (active === 'merge') {
        document = await PDFDocument.create()
        for (const file of files) {
          const source = await PDFDocument.load(await file.arrayBuffer())
          const copied = await document.copyPages(source, source.getPageIndices())
          copied.forEach(page => document.addPage(page))
        }
        filename = 'merged.pdf'
      } else if (active === 'split') {
        const source = await PDFDocument.load(await files[0].arrayBuffer())
        const indices = parsePageRanges(pages, source.getPageCount())
        document = await PDFDocument.create()
        const copied = await document.copyPages(source, indices)
        copied.forEach(page => document.addPage(page))
        filename = 'extracted-pages.pdf'
      } else if (active === 'rotate') {
        document = await PDFDocument.load(await files[0].arrayBuffer())
        for (const page of document.getPages()) {
          page.setRotation(degrees((page.getRotation().angle + Number(angle)) % 360))
        }
        filename = 'rotated.pdf'
      } else if (active === 'images') {
        document = await PDFDocument.create()
        for (const file of files) {
          const data = await file.arrayBuffer()
          const png = file.type === 'image/png' || /\.png$/i.test(file.name)
          const image = png ? await document.embedPng(data) : await document.embedJpg(data)
          const page = document.addPage([image.width, image.height])
          page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height })
        }
        filename = 'images.pdf'
      }
      const bytes = await document.save()
      saveFile(bytes, filename)
      setMessage(`${filename} is ready — your download should begin automatically.`)
    } catch (err) {
      console.error(err)
      setError('Could not process the file. Make sure it is valid, not password-protected, and try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="site-shell">
      <header className="header">
        <div className="container header-content">
          <button className="brand" onClick={() => setActive(null)} aria-label="Go to home page">
            <span className="brand-mark"><Files size={22}/></span><span>PDF<span className="brand-light">Kit</span></span>
          </button>
          <nav><a href="#tools" onClick={() => setActive(null)}>Tools</a><a href="#privacy">Privacy</a><a href="#about">About</a></nav>
          <span className="header-tag"><ShieldCheck size={15}/> Private by design</span>
        </div>
      </header>

      <main>
        {!active ? <>
          <section className="hero container">
            <div className="eyebrow"><Sparkles size={15}/> SIMPLE, FREE PDF TOOLS</div>
            <h1>Every PDF task.<br/><span>One simple place.</span></h1>
            <p>Merge, split, rotate, and convert your files in seconds. No accounts, no uploads, no hassle.</p>
            <a className="primary hero-button" href="#tools">Explore tools <span>↓</span></a>
            <div className="hero-privacy"><LockKeyhole size={16}/> Files are processed right in your browser</div>
          </section>

          <section id="tools" className="tools-section container">
            <div className="section-top"><div><div className="section-kicker">YOUR TOOLKIT</div><h2>What would you like to do?</h2></div><span className="tool-count">4 free tools</span></div>
            <div className="tool-grid">
              {tools.map(tool => {
                const Icon = tool.icon
                return <button className="tool-card" key={tool.id} onClick={() => openTool(tool.id)}>
                  <span className={`tool-icon ${tool.color}`}><Icon size={25}/></span>
                  <h3>{tool.title}</h3><p>{tool.description}</p><span className="card-link">Use tool <span>→</span></span>
                </button>
              })}
            </div>
          </section>
        </> : <section className="workspace container">
          <button className="back-button" onClick={() => setActive(null)}><ArrowLeft size={17}/> All tools</button>
          <div className="workspace-head"><span className={`tool-icon ${current.color}`}><current.icon size={25}/></span><h1>{current.title}</h1><p>{current.description}</p></div>
          <div className="workspace-card">
            <input ref={inputRef} className="visually-hidden" type="file" accept={current.accept} multiple={current.multiple} onChange={e => addFiles(e.target.files)}/>
            <div className={`upload-zone ${dragging ? 'dragging' : ''}`} onClick={() => inputRef.current?.click()} onDragOver={e => {e.preventDefault(); setDragging(true)}} onDragLeave={() => setDragging(false)} onDrop={e => {e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files)}} role="button" tabIndex={0} onKeyDown={e => {if (e.key === 'Enter' || e.key === ' ') {e.preventDefault();inputRef.current?.click()}}}>
              <span className="upload-icon"><UploadCloud size={30}/></span>
              <strong>Choose {current.id === 'images' ? 'images' : 'PDF files'}</strong>
              <p>Click to browse or drag and drop here</p>
              <span className="file-hint">{current.id === 'images' ? 'JPG and PNG' : 'PDF'} · No server uploads</span>
            </div>
            {files.length > 0 && <div className="selected-files"><div className="files-label">Selected files ({files.length})</div>{files.map((file, index) => <div className="file-row" key={`${file.name}-${index}`}><FilePlus2 size={18}/><span>{file.name}</span><small>{(file.size / (1024 * 1024)).toFixed(2)} MB</small><button aria-label={`Remove ${file.name}`} onClick={() => setFiles(prev => prev.filter((_, i) => i !== index))}><X size={16}/></button></div>)}</div>}
            {active === 'split' && <div className="setting"><label htmlFor="pages">Pages to extract</label><input id="pages" value={pages} onChange={e => setPages(e.target.value)} placeholder="1,3-5"/><small>For example: 1,3-5 extracts pages 1, 3, 4 and 5.</small></div>}
            {active === 'rotate' && <div className="setting"><label htmlFor="angle">Rotate all pages clockwise</label><select id="angle" value={angle} onChange={e => setAngle(e.target.value)}><option value="90">90°</option><option value="180">180°</option><option value="270">270°</option></select></div>}
            {error && <div className="notice error" role="alert">{error}</div>}
            {message && <div className="notice success" role="status"><CheckCircle2 size={18}/>{message}</div>}
            <button className="primary process" onClick={processFiles} disabled={busy || !files.length}>{busy ? 'Processing…' : <><ArrowDownToLine size={19}/> {active === 'merge' ? 'Merge & download' : active === 'split' ? 'Extract & download' : active === 'rotate' ? 'Rotate & download' : 'Convert & download'}</>}</button>
            <div className="workspace-footer"><LockKeyhole size={15}/> Your files never leave this device.</div>
          </div>
        </section>}

        <section id="privacy" className="privacy-section"><div className="container privacy-inner"><div className="privacy-art"><ShieldCheck size={50}/></div><div><div className="section-kicker">PRIVACY MATTERS</div><h2>Your documents stay yours.</h2><p>PDFKit processes your files locally in your browser using JavaScript. This version does not send your documents to our servers. Avoid sensitive files on shared or untrusted devices.</p></div></div></section>
        <section id="about" className="about-section container"><h2>Easy tools, less busywork.</h2><p>A straightforward toolkit for everyday document tasks. No account required. PDF files that are encrypted or password protected may not work.</p></section>
      </main>
      <footer><div className="container footer-content"><div className="brand footer-brand"><span className="brand-mark"><Files size={18}/></span><span>PDF<span className="brand-light">Kit</span></span></div><span>Made for simpler documents · © {new Date().getFullYear()}</span></div></footer>
    </div>
  )
}
