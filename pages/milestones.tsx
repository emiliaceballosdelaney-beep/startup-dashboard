import { useEffect, useState } from 'react'
import Sidebar from '../components/Sidebar'
import StartupTabs from '../components/StartupTabs'
import Modal from '../components/Modal'
import { supabase, Startup, Milestone } from '../lib/supabase'

function fmt(d?: string | null) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
