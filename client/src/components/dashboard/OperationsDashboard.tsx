import { useQuery } from '@tanstack/react-query'
import axios from 'axios'

const OperationsDashboard = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'operations'],
    queryFn: async () => {
      const res = await axios.get('/api/dashboard/operations')
      return res.data
    },
  })

  if (isLoading) return <div>Loading...</div>

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="text-2xl font-bold text-gray-900">
              {data?.pendingInstallation || 0}
            </div>
            <div className="text-sm text-gray-500">Pending Installation</div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="text-2xl font-bold text-gray-900">
              {data?.submittedForSubsidy || 0}
            </div>
            <div className="text-sm text-gray-500">Submitted for Subsidy</div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="text-2xl font-bold text-gray-900">
              {data?.subsidyCredited || 0}
            </div>
            <div className="text-sm text-gray-500">Subsidy Credited</div>
          </div>
        </div>
      </div>

      {data?.pendingSubsidy && data.pendingSubsidy.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Pending Subsidy ({data.pendingSubsidy.length})
            </h3>
            <div className="space-y-2">
              {data.pendingSubsidy.map((item: any) => (
                <div key={item.id} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{item.customerName}</span>
                  <span className="text-xs text-gray-500">
                    {item.daysPending} days pending
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default OperationsDashboard
