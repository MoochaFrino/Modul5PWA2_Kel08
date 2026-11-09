import { useState, Suspense, lazy, useEffect } from 'react'
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import PWABadge from './components/PWABadge.jsx'
import SplashScreen from './components/common/SplashScreen.jsx'
import gunService from './services/gunService.js'
import { Loader } from 'lucide-react'
import './App.css'

const Catalog = lazy(() => import('./pages/Catalog.jsx'))
const FavoritesPage = lazy(() => import('./pages/FavoritesPage.jsx'))
const ProfilePage = lazy(() => import('./pages/ProfilePage.jsx'))
const CreateGunPage = lazy(() => import('./pages/CreateGunPage.jsx'))
const EditGunPage = lazy(() => import('./pages/EditGunPage.jsx'))
const GunDetail = lazy(() => import('./components/gun/GunDetail.jsx'))

function App() {
  const [showSplash, setShowSplash] = useState(true)
  const [tab, setTab] = useState('Catalog')
  const [mode, setMode] = useState('list')
  const [selectedGun, setSelectedGun] = useState(null)
  const [editingGun, setEditingGun] = useState(null)
  const [resumeDraftId, setResumeDraftId] = useState(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const gunId = params.get('gunId')
    if (gunId) {
      setShowSplash(false)
      gunService
        .getGunById(gunId)
        .then((res) => {
          if (res.success) {
            setSelectedGun(res.data)
            setMode('detail')
          }
        })
        .catch(console.error)
    }
  }, [])

  const handleNavigate = (target, payload) => {
    if (target === 'Create') {
      setResumeDraftId(null)
      setMode('create')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else if (target === 'ResumeDraft') {
      setResumeDraftId(payload || 'create')
      setMode('create')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else if (target === 'Edit') {
      setEditingGun(payload)
      setMode('edit')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else if (target === 'Detail') {
      setSelectedGun(payload)
      setMode('detail')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      setTab(target)
      setMode('list')
      setSelectedGun(null)
      setEditingGun(null)
      setResumeDraftId(null)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      window.history.pushState({}, '', window.location.pathname)
    }
  }

  const handleBackToList = () => {
    setMode('list')
    setSelectedGun(null)
    setEditingGun(null)
    setResumeDraftId(null)
    window.history.pushState({}, '', window.location.pathname)
  }

  const handleArchiveFromDetail = async (gun) => {
    if (!gun) return
    await gunService.archiveGun(gun.id, gun)
    handleBackToList()
    setTab('Profile')
  }

  return (
    <div className="shell">
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
      <Header
        tab={mode === 'list' ? tab : ''}
        onTab={(newTab) => handleNavigate(newTab)}
        onNavigateCreate={() => handleNavigate('Create')}
      />
      <main className="main">
        <Suspense
          fallback={
            <div className="state-box">
              <Loader className="spin" size={28} />
              <p>Memuat antarmuka...</p>
            </div>
          }
        >
          {mode === 'create' && (
            <CreateGunPage
              autoLoadDraftId={resumeDraftId}
              onBack={handleBackToList}
              onSuccess={() => {
                handleBackToList()
                setTab('Catalog')
              }}
            />
          )}
          {mode === 'edit' && (
            <EditGunPage
              gun={editingGun}
              gunId={editingGun?.id}
              onBack={handleBackToList}
              onSuccess={() => {
                handleBackToList()
                setTab('Catalog')
              }}
            />
          )}
          {mode === 'detail' && selectedGun && (
            <GunDetail
              gun={selectedGun}
              onBack={handleBackToList}
              onEdit={(g) => handleNavigate('Edit', g)}
              onDelete={handleArchiveFromDetail}
            />
          )}
          {mode === 'list' && (
            <>
              {tab === 'Catalog' && (
                <Catalog onNavigate={(dest, payload) => handleNavigate(dest, payload)} />
              )}
              {tab === 'Favorites' && (
                <FavoritesPage
                  onSelectGun={(g) => handleNavigate('Detail', g)}
                  onNavigateCatalog={() => setTab('Catalog')}
                />
              )}
              {tab === 'Profile' && (
                <ProfilePage
                  onReplaySplash={() => setShowSplash(true)}
                  onSelectGun={(g) => handleNavigate('Detail', g)}
                  onContinueDraft={(draftId) => handleNavigate('ResumeDraft', draftId)}
                />
              )}
            </>
          )}
        </Suspense>
      </main>
      <PWABadge />
      <Footer />
    </div>
  )
}

export default App
