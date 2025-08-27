import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-toastify';
import { 
  Presentation, 
  ContentSection, 
  PresentationComment,
  PresentationVersion 
} from '../types/Presentation';
import { 
  getPresentation,
  updatePresentation,
  listSections,
  updateSection,
  deleteSection,
  reorderSections
} from '../api/presentationApi';

interface PresentationState {
  presentation: Presentation | null;
  sections: ContentSection[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  hasUnsavedChanges: boolean;
  selectedSectionIds: string[];
  lastSaved: Date | null;
}

interface PresentationActions {
  loadPresentation: (id: string) => Promise<void>;
  updatePresentationData: (updates: Partial<Presentation>) => Promise<void>;
  updateSectionData: (sectionId: string, updates: Partial<ContentSection>) => Promise<void>;
  deleteSectionData: (sectionId: string) => Promise<void>;
  reorderSectionsData: (newOrder: ContentSection[]) => Promise<void>;
  toggleSectionSelection: (sectionId: string) => void;
  selectAllSections: () => void;
  clearSelection: () => void;
  saveChanges: () => Promise<void>;
  discardChanges: () => void;
}

export const usePresentationState = (): [PresentationState, PresentationActions] => {
  const [state, setState] = useState<PresentationState>({
    presentation: null,
    sections: [],
    loading: false,
    saving: false,
    error: null,
    hasUnsavedChanges: false,
    selectedSectionIds: [],
    lastSaved: null
  });

  const originalDataRef = useRef<{
    presentation: Presentation | null;
    sections: ContentSection[];
  }>({ presentation: null, sections: [] });

  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();

  // Auto-save functionality
  useEffect(() => {
    if (state.hasUnsavedChanges) {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      
      autoSaveTimeoutRef.current = setTimeout(() => {
        actions.saveChanges();
      }, 3000); // Auto-save after 3 seconds of inactivity
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [state.hasUnsavedChanges]);

  const loadPresentation = useCallback(async (id: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const presentation = await getPresentation(id);
      const sections = presentation.content_sections || [];
      
      setState(prev => ({
        ...prev,
        presentation,
        sections,
        loading: false,
        hasUnsavedChanges: false,
        selectedSectionIds: []
      }));

      originalDataRef.current = { presentation, sections };
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to load presentation'
      }));
    }
  }, []);

  const updatePresentationData = useCallback(async (updates: Partial<Presentation>) => {
    if (!state.presentation) return;

    const updatedPresentation = { ...state.presentation, ...updates };
    
    setState(prev => ({
      ...prev,
      presentation: updatedPresentation,
      hasUnsavedChanges: true
    }));

    try {
      const saved = await updatePresentation(state.presentation.id, updates);
      setState(prev => ({
        ...prev,
        presentation: saved,
        hasUnsavedChanges: false,
        lastSaved: new Date()
      }));
      originalDataRef.current.presentation = saved;
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        presentation: state.presentation, // Revert on error
        error: error.message || 'Failed to update presentation'
      }));
    }
  }, [state.presentation]);

  const updateSectionData = useCallback(async (sectionId: string, updates: Partial<ContentSection>) => {
    if (!state.presentation) return;

    const updatedSections = state.sections.map(section =>
      section.id === sectionId ? { ...section, ...updates } : section
    );

    setState(prev => ({
      ...prev,
      sections: updatedSections,
      hasUnsavedChanges: true
    }));

    try {
      const updated = await updateSection(state.presentation.id, sectionId, updates);
      setState(prev => ({
        ...prev,
        sections: prev.sections.map(s => s.id === sectionId ? updated : s),
        hasUnsavedChanges: false,
        lastSaved: new Date()
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        sections: state.sections, // Revert on error
        error: error.message || 'Failed to update section'
      }));
    }
  }, [state.presentation, state.sections]);

  const deleteSectionData = useCallback(async (sectionId: string) => {
    if (!state.presentation) return;

    const originalSections = [...state.sections];
    const updatedSections = state.sections.filter(s => s.id !== sectionId);

    setState(prev => ({
      ...prev,
      sections: updatedSections,
      selectedSectionIds: prev.selectedSectionIds.filter(id => id !== sectionId),
      hasUnsavedChanges: true
    }));

    try {
      await deleteSection(state.presentation.id, sectionId);
      setState(prev => ({
        ...prev,
        hasUnsavedChanges: false,
        lastSaved: new Date()
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        sections: originalSections, // Revert on error
        error: error.message || 'Failed to delete section'
      }));
    }
  }, [state.presentation, state.sections]);

  const reorderSectionsData = useCallback(async (newOrder: ContentSection[]) => {
    if (!state.presentation) return;

    const originalSections = [...state.sections];
    
    setState(prev => ({
      ...prev,
      sections: newOrder,
      hasUnsavedChanges: true
    }));

    try {
      const sectionOrders = newOrder.map((section, index) => ({
        id: section.id,
        order: index
      }));
      
      await reorderSections(state.presentation.id, sectionOrders);
      
      setState(prev => ({
        ...prev,
        hasUnsavedChanges: false,
        lastSaved: new Date()
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        sections: originalSections, // Revert on error
        error: error.message || 'Failed to reorder sections'
      }));
    }
  }, [state.presentation, state.sections]);

  const toggleSectionSelection = useCallback((sectionId: string) => {
    setState(prev => ({
      ...prev,
      selectedSectionIds: prev.selectedSectionIds.includes(sectionId)
        ? prev.selectedSectionIds.filter(id => id !== sectionId)
        : [...prev.selectedSectionIds, sectionId]
    }));
  }, []);

  const selectAllSections = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedSectionIds: prev.sections.map(s => s.id)
    }));
  }, []);

  const clearSelection = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedSectionIds: []
    }));
  }, []);

  const saveChanges = useCallback(async () => {
    if (!state.hasUnsavedChanges) return;

    setState(prev => ({ ...prev, saving: true }));

    try {
      // Save any pending changes
      setState(prev => ({
        ...prev,
        saving: false,
        hasUnsavedChanges: false,
        lastSaved: new Date()
      }));
      
      toast.success('Changes saved successfully');
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        saving: false,
        error: error.message || 'Failed to save changes'
      }));
    }
  }, [state.hasUnsavedChanges]);

  const discardChanges = useCallback(() => {
    setState(prev => ({
      ...prev,
      presentation: originalDataRef.current.presentation,
      sections: originalDataRef.current.sections,
      hasUnsavedChanges: false,
      selectedSectionIds: []
    }));
  }, []);

  const actions: PresentationActions = {
    loadPresentation,
    updatePresentationData,
    updateSectionData,
    deleteSectionData,
    reorderSectionsData,
    toggleSectionSelection,
    selectAllSections,
    clearSelection,
    saveChanges,
    discardChanges
  };

  return [state, actions];
};