import React from "react";
import * as fabric from "fabric";
import TextToImage from "./TextToImage";
import ProjectPersistencePanel from "./Editor/ProjectPersistencePanel";
import TextPropertiesPanel from "./Editor/TextPropertiesPanel";
import ShapePropertiesPanel from "./Editor/ShapePropertiesPanel";
import TemplateLibraryPanel from "./Editor/TemplateLibraryPanel";
import { Tabs, Tab } from "./ui/tabs";
import { useGlobal } from "../context/GlobalContext";
import { FiChevronLeft, FiChevronRight, FiFolder, FiType, FiSquare, FiSave, FiChevronDown, FiChevronUp } from "react-icons/fi";

interface PartialSidebarProps {
  activeSection: string;
  canvasRef?: React.MutableRefObject<fabric.Canvas | null>;
  layerPanelRef: React.RefObject<{ refreshLayers: () => void }>;
  disabled: boolean;
  onObjectSelect: (selectedObject: fabric.Object | null) => void;
  activeTab: string;
  setActiveTab: React.Dispatch<React.SetStateAction<string>>;
  selectedObject: fabric.Object | null;
  initialCollapsed?: boolean;
  setIsInsertingTemplate: React.Dispatch<React.SetStateAction<boolean>>;
  isInsertingTemplate: boolean;
}

const PartialSidebar: React.FC<PartialSidebarProps> = ({
  activeSection,
  canvasRef,
  disabled,
  activeTab,
  setActiveTab,
  selectedObject,
  initialCollapsed,
  layerPanelRef,
  setIsInsertingTemplate,
}) => {
  const { setGeneratData } = useGlobal();
  const [collapsed, setCollapsed] = React.useState(initialCollapsed ?? false);
  const handleGenerate = (requestData: { prompt: string; style: string; aspectRatio: string; numImages: number }) => {
    if (disabled) return;
    setGeneratData(requestData);
  };

  const handleToggleCollapse = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    localStorage.setItem("editor_sidebar_collapsed", String(newState));
  };

  const tabIcons = {
    "Templates": <FiFolder size={20} />,
    "Text": <FiType size={20} />,
    "Shapes": <FiSquare size={20} />,
    // "Brand Kit": <FiAperture size={20} />,
    "Project": <FiSave size={20} />
  };

  return (
    <div className={`transition-all duration-500 ease-in-out ${collapsed ? 'h-0 md:h-full w-full md:w-0' : 'h-[85vh] md:h-full w-full md:w-86'} bg-gray-900 p-4 flex flex-col overflow-hidden`}>
      <div className="flex justify-end">
        <button
          onClick={handleToggleCollapse}
          className="text-gray-200 hover:text-white transition-all"
          title={collapsed ? "Expand Panel" : "Collapse Panel"}
        >
          {/* Show ↑/↓ icon for mobile, ←/→ for desktop */}
          <span className="block md:hidden">
            {collapsed ? <FiChevronDown size={22} /> : <FiChevronUp size={22} />}
          </span>
          <span className="hidden md:block">
            {collapsed ? <FiChevronRight size={22} /> : <FiChevronLeft size={22} />}
          </span>
        </button>
      </div>

      <div className="flex-1 px-4 overflow-y-auto">
        {activeSection === "textToImage" ? (
          <TextToImage onGenerate={handleGenerate} disabled={disabled} />
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            {Object.entries(tabIcons).map(([tabKey, icon]) => (
              <Tab
                key={tabKey}
                value={tabKey}
                title={
                  collapsed ? (
                    <div
                      className={`flex justify-center p-2 group relative hover:scale-110 transition-transform ${activeTab === tabKey ? 'bg-gray-900 rounded-lg' : ''}`}
                      title={tabKey}
                    >
                      <div className="group relative">
                        {icon}
                        <span className="absolute left-full top-1/2 -translate-y-1/2 ml-2 bg-gray-900 text-white text-xs rounded px-2 py-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          {tabKey}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <span className={`flex items-center gap-2 hover:scale-105 transition-transform ${activeTab === tabKey ? 'font-bold text-gray-100' : ''}`}>{icon} {tabKey}</span>
                  )
                }
              >
                {!collapsed && (
                  <>
                    {tabKey === "Templates" && canvasRef && <TemplateLibraryPanel canvasRef={canvasRef} layerPanelRef={layerPanelRef} setIsInsertingTemplate={setIsInsertingTemplate}/>}
                    {tabKey === "Text" && (
                      <>
                        {canvasRef && <TextPropertiesPanel canvasRef={canvasRef} selectedObject={selectedObject} />}
                      </>
                    )}
                    {tabKey === "Shapes" && canvasRef && <ShapePropertiesPanel canvasRef={canvasRef} layerPanelRef={layerPanelRef} selectedObject={selectedObject} />}
                    {/* {tabKey === "Brand Kit" && canvasRef && <BrandKitPanel canvasRef={canvasRef} />} */}
                    {tabKey === "Project" && canvasRef && <ProjectPersistencePanel canvasRef={canvasRef} layerPanelRef={layerPanelRef} />}
                  </>
                )}
              </Tab>
            ))}
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default PartialSidebar;
