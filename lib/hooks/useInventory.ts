import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Inventory, InventoryUpdate } from '../types/database';

// API 함수들
const inventoryApi = {
  // 재고 목록 조회
  getAll: async (filters?: { category?: string; low_stock?: boolean }) => {
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.low_stock) params.append('low_stock', 'true');
    
    const response = await fetch(`/api/inventory?${params.toString()}`);
    if (!response.ok) {
      throw new Error('재고 목록을 가져오는데 실패했습니다.');
    }
    return response.json();
  },
  
  // 재고 업데이트
  update: async (data: InventoryUpdate) => {
    const response = await fetch('/api/inventory', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '재고 업데이트에 실패했습니다.');
    }
    
    return response.json();
  },
};

// React Query 훅들
export const useInventory = (filters?: { category?: string; low_stock?: boolean }) => {
  return useQuery({
    queryKey: ['inventory', filters],
    queryFn: () => inventoryApi.getAll(filters),
    staleTime: 3 * 60 * 1000, // 3분
    refetchOnWindowFocus: false,
  });
};

export const useUpdateInventory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: inventoryApi.update,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
    onError: (error) => {
      console.error('재고 업데이트 에러:', error);
    },
  });
}; 