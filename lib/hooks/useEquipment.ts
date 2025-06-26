import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Equipment, EquipmentInsert } from '../types/database';

// API 함수들
const equipmentApi = {
  // 설비 목록 조회
  getAll: async (filters?: { model_code?: string; status?: string }) => {
    const params = new URLSearchParams();
    if (filters?.model_code) params.append('model_code', filters.model_code);
    if (filters?.status) params.append('status', filters.status);
    
    const response = await fetch(`/api/equipment?${params.toString()}`);
    if (!response.ok) {
      throw new Error('설비 목록을 가져오는데 실패했습니다.');
    }
    return response.json();
  },
  
  // 설비 생성
  create: async (data: EquipmentInsert) => {
    const response = await fetch('/api/equipment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '설비 생성에 실패했습니다.');
    }
    
    return response.json();
  },
  
  // 설비 수정
  update: async (id: string, data: Partial<Equipment>) => {
    const response = await fetch(`/api/equipment/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '설비 수정에 실패했습니다.');
    }
    
    return response.json();
  },
  
  // 설비 삭제
  delete: async (id: string) => {
    const response = await fetch(`/api/equipment/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '설비 삭제에 실패했습니다.');
    }
    
    return response.json();
  },
};

// React Query 훅들
export const useEquipments = (filters?: { model_code?: string; status?: string }) => {
  return useQuery({
    queryKey: ['equipments', filters],
    queryFn: () => equipmentApi.getAll(filters),
    staleTime: 5 * 60 * 1000, // 5분
    refetchOnWindowFocus: false,
  });
};

export const useCreateEquipment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: equipmentApi.create,
    onSuccess: () => {
      // 설비 목록 쿼리 무효화하여 새로고침
      queryClient.invalidateQueries({ queryKey: ['equipments'] });
    },
    onError: (error) => {
      console.error('설비 생성 에러:', error);
    },
  });
};

export const useUpdateEquipment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Equipment> }) =>
      equipmentApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipments'] });
    },
    onError: (error) => {
      console.error('설비 수정 에러:', error);
    },
  });
};

export const useDeleteEquipment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: equipmentApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipments'] });
    },
    onError: (error) => {
      console.error('설비 삭제 에러:', error);
    },
  });
};

// 설비 상태별 통계
export const useEquipmentStats = () => {
  return useQuery({
    queryKey: ['equipment-stats'],
    queryFn: async () => {
      const response = await equipmentApi.getAll();
      const equipments = response.data || [];
      
      const stats = {
        total: equipments.length,
        active: equipments.filter((eq: Equipment) => eq.status === 'active').length,
        maintenance: equipments.filter((eq: Equipment) => eq.status === 'maintenance').length,
        offline: equipments.filter((eq: Equipment) => eq.status === 'offline').length,
        byModel: {} as Record<string, number>,
      };
      
      // 모델별 통계
      equipments.forEach((eq: Equipment) => {
        stats.byModel[eq.model_code] = (stats.byModel[eq.model_code] || 0) + 1;
      });
      
      return stats;
    },
    staleTime: 2 * 60 * 1000, // 2분
  });
}; 