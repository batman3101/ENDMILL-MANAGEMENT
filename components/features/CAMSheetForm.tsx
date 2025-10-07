'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useInventorySearch } from '../../lib/hooks/useInventory'
import { useToast } from '../shared/Toast'

interface EndmillInfo {
  tNumber: number
  endmillCode: string
  endmillName: string
  specifications: string
  toolLife: number
}

interface CAMSheetFormData {
  model: string
  process: string
  camVersion: string
  versionDate: string
  endmills: EndmillInfo[]
}

interface CAMSheetFormProps {
  onSubmit: (data: CAMSheetFormData) => void
  onCancel: () => void
  initialData?: Partial<CAMSheetFormData>
}

export default function CAMSheetForm({ onSubmit, onCancel, initialData }: CAMSheetFormProps) {
  const { t } = useTranslation()
  const { showSuccess, showError, showWarning } = useToast()
  const { searchByCode } = useInventorySearch()

  const [formData, setFormData] = useState<CAMSheetFormData>({
    model: initialData?.model || '',
    process: initialData?.process || '',
    camVersion: initialData?.camVersion || '',
    versionDate: initialData?.versionDate || new Date().toISOString().split('T')[0],
    endmills: initialData?.endmills || []
  })

  const [newEndmill, setNewEndmill] = useState<EndmillInfo>({
    tNumber: 1,
    endmillCode: '',
    endmillName: '',
    specifications: '',
    toolLife: 2000
  })

  const [errorMessage, setErrorMessage] = useState('')
  const [autoLoadedInfo, setAutoLoadedInfo] = useState<{name: string, specifications: string} | null>(null)

  // 앤드밀 코드 변경 시 자동으로 정보 불러오기
  const handleEndmillCodeChange = (code: string) => {
    setNewEndmill(prev => ({ ...prev, endmillCode: code }))
    setErrorMessage('')
    setAutoLoadedInfo(null)

    if (code.trim()) {
      const foundEndmills = searchByCode(code.trim().toUpperCase())
      const foundEndmill = foundEndmills[0] // 첫 번째 결과 사용
      
      if (foundEndmill) {
        // 자동으로 이름과 사양 설정, Tool Life는 기본값 유지 (수동 입력 가능)
        const specifications = foundEndmill.endmill_types?.specifications 
          ? JSON.stringify(foundEndmill.endmill_types.specifications) 
          : ''
        
        setNewEndmill(prev => ({
          ...prev,
          endmillCode: foundEndmill.endmill_types?.code || code,
          endmillName: foundEndmill.endmill_types?.description_ko || foundEndmill.endmill_types?.description_vi || '',
          specifications: specifications,
          // toolLife는 기존 값 유지 (수동 입력)
        }))
        setAutoLoadedInfo({
          name: foundEndmill.endmill_types?.description_ko || foundEndmill.endmill_types?.description_vi || '',
          specifications: specifications
        })
      } else {
        // 앤드밀 코드가 없으면 기존 정보 초기화
        setNewEndmill(prev => ({
          ...prev,
          endmillCode: code,
          endmillName: '',
          specifications: ''
        }))
        if (code.length >= 3) { // 3글자 이상 입력했을 때만 에러 표시
          setErrorMessage(t('camSheets.endmillNotFound', { code }))
        }
      }
    } else {
      // 코드가 비어있으면 모든 정보 초기화
      setNewEndmill(prev => ({
        ...prev,
        endmillCode: '',
        endmillName: '',
        specifications: ''
      }))
    }
  }

  const handleAddEndmill = () => {
    if (!newEndmill.endmillCode || !newEndmill.endmillName) {
      showError('입력 오류', '앤드밀 코드와 이름을 입력해주세요.')
      return
    }

    // T번호 중복 확인
    if (formData.endmills.some(e => e.tNumber === newEndmill.tNumber)) {
      showWarning(t('camSheets.duplicateError'), t('camSheets.duplicateTNumber'))
      return
    }

    setFormData(prev => ({
      ...prev,
      endmills: [...prev.endmills, { ...newEndmill }]
    }))

    // 폼 초기화
    setNewEndmill({
      tNumber: 1,
      endmillCode: '',
      endmillName: '',
      specifications: '',
      toolLife: 2000
    })
    setErrorMessage('')
    setAutoLoadedInfo(null)
    
    showSuccess(t('camSheets.endmillAdded'), t('camSheets.endmillAddedMessage', { number: newEndmill.tNumber.toString().padStart(2, '0') }))
  }

  const handleRemoveEndmill = (tNumber: number) => {
    setFormData(prev => ({
      ...prev,
      endmills: prev.endmills.filter(e => e.tNumber !== tNumber)
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.model || !formData.process || !formData.camVersion) {
      showError('입력 오류', '필수 필드를 모두 입력해주세요.')
      return
    }

    if (formData.endmills.length === 0) {
      showError('앤드밀 필요', '최소 하나 이상의 앤드밀을 등록해주세요.')
      return
    }

    onSubmit(formData)
    showSuccess(
      initialData ? t('camSheets.updated') : t('camSheets.saved'),
      initialData
        ? 'CAM Sheet가 성공적으로 수정되었습니다.'
        : '새로운 CAM Sheet가 성공적으로 등록되었습니다.'
    )
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">
              {initialData ? t('camSheets.camSheetFormEditTitle') : t('camSheets.camSheetFormTitle')}
            </h3>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          {/* 기본 정보 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('camSheets.modelLabel')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="PA-001"
                value={formData.model}
                onChange={(e) => setFormData({...formData, model: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('camSheets.processLabel')} <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.process}
                onChange={(e) => setFormData({...formData, process: e.target.value})}
                className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">{t('camSheets.selectProcess')}</option>
                <option value="CNC1">CNC1</option>
                <option value="CNC2">CNC2</option>
                <option value="CNC2-1">CNC2-1</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('camSheets.camVersionLabel')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="v1.0"
                value={formData.camVersion}
                onChange={(e) => setFormData({...formData, camVersion: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('camSheets.versionDateLabel')}
              </label>
              <input
                type="date"
                value={formData.versionDate}
                onChange={(e) => setFormData({...formData, versionDate: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* 앤드밀 등록 섹션 */}
          <div className="border-t pt-6">
            <h4 className="text-lg font-semibold mb-4">{t('camSheets.endmillInfoRegistration')}</h4>

            {/* 앤드밀 추가 폼 */}
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('camSheets.tNumberLabel')}</label>
                  <select
                    value={newEndmill.tNumber}
                    onChange={(e) => setNewEndmill({...newEndmill, tNumber: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Array.from({length: 21}, (_, i) => i + 1).map(num => (
                      <option key={num} value={num} disabled={formData.endmills.some(e => e.tNumber === num)}>
                        T{num.toString().padStart(2, '0')}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('camSheets.endmillCodeLabel')}</label>
                  <input
                    type="text"
                    placeholder="AT001"
                    value={newEndmill.endmillCode}
                    onChange={(e) => handleEndmillCodeChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {errorMessage && (
                    <p className="text-red-600 text-xs mt-1">{errorMessage}</p>
                  )}
                  {autoLoadedInfo && (
                    <p className="text-green-600 text-xs mt-1">✓ {t('camSheets.autoLoaded')}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <input
                    type="text"
                    placeholder="FLAT 12mm 4날"
                    value={newEndmill.endmillName}
                    onChange={(e) => setNewEndmill({...newEndmill, endmillName: e.target.value})}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      autoLoadedInfo ? 'bg-green-50' : ''
                    }`}
                    readOnly={!!autoLoadedInfo}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('camSheets.toolLifeLabel')}</label>
                  <input
                    type="number"
                    placeholder="2000"
                    value={newEndmill.toolLife}
                    onChange={(e) => setNewEndmill({...newEndmill, toolLife: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                  />
                  <p className="text-xs text-gray-500 mt-1">{t('camSheets.autoLoaded')}</p>
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleAddEndmill}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    {t('camSheets.addButton')}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('camSheets.specificationsLabel')}</label>
                <input
                  type="text"
                  placeholder="직경12mm, 4날, 코팅TiN"
                  value={newEndmill.specifications}
                  onChange={(e) => setNewEndmill({...newEndmill, specifications: e.target.value})}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    autoLoadedInfo ? 'bg-green-50' : ''
                  }`}
                  readOnly={!!autoLoadedInfo}
                />
              </div>
            </div>

            {/* 등록된 앤드밀 목록 */}
            {formData.endmills.length > 0 && (
              <div className="mb-6">
                <h5 className="text-md font-medium mb-3">{t('camSheets.registered')} ({formData.endmills.length}{t('camSheets.items')})</h5>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('camSheets.tNumberLabel')}</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('camSheets.endmillCodeLabel')}</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('camSheets.endmillNameLabel')}</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('camSheets.toolLifeLabel')}</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('camSheets.actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {formData.endmills.sort((a, b) => a.tNumber - b.tNumber).map((endmill) => (
                        <tr key={endmill.tNumber} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm font-medium">T{endmill.tNumber.toString().padStart(2, '0')}</td>
                          <td className="px-4 py-2 text-sm">{endmill.endmillCode}</td>
                          <td className="px-4 py-2 text-sm">{endmill.endmillName}</td>
                          <td className="px-4 py-2 text-sm">{endmill.toolLife.toLocaleString()}{t('camSheets.times')}</td>
                          <td className="px-4 py-2 text-sm">
                            <button
                              type="button"
                              onClick={() => handleRemoveEndmill(endmill.tNumber)}
                              className="text-red-600 hover:text-red-800"
                            >
                              {t('camSheets.deleteButton')}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* 버튼 */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
            >
              {t('camSheets.cancelButton')}
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {initialData ? t('camSheets.updateButton') : t('camSheets.saveButton')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 