import { Navigate, Route, Routes } from 'react-router-dom'
import CabinetLedger from '../pages/CabinetLedger'
import Dashboard from '../pages/Dashboard'
import FiberBatchList from '../pages/FiberBatchList'
import MouldLedger from '../pages/MouldLedger'
import RunBoard from '../pages/RunBoard'
import SampleCards from '../pages/SampleCards'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/moulds" element={<MouldLedger />} />
      <Route path="/fibers" element={<FiberBatchList />} />
      <Route path="/runs" element={<RunBoard />} />
      <Route path="/samples" element={<SampleCards />} />
      <Route path="/cabinets" element={<CabinetLedger />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
