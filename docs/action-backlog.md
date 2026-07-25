# Action Backlog

Source: [kyletmartinez/after-effects-scripts](https://github.com/kyletmartinez/after-effects-scripts)

**Effort key**: Low = direct port, Medium = needs parameterization, High = file I/O / heavy UI / plugin dep
**Status key**: `[ ]` todo · `[x]` done · `[-]` skipped (covered or low value)

---

## Top 20 — Priority Queue

| Status | Script | Category | Effort | Notes |
|--------|--------|----------|--------|-------|
| `[x]` | Add_Markers_At_Out_Points | marker | Low | Places markers at layer out points |
| `[x]` | Add_Markers_To_Selected_Layers | marker | Low | Places comp markers on selected layers |
| `[x]` | Invert_Selected_Keyframes | property | Low | Multiplies keyframe values by -1 |
| `[x]` | Remove_Redundant_Keyframes | property | Low | Removes keyframes that don't affect animation |
| `[x]` | Make_Hold_Keyframes | property | Low | Converts keyframes to hold (flat segments) |
| `[x]` | Randomize_Layer_Start_Time | layer | Low | Random offset to layer start times |
| `[x]` | Set_Track_Matte_To_Above | layer | Low | Sets track matte mode to layer above |
| `[x]` | Set_To_Average_Position | layer | Low | Centers selected layers at average position |
| `[x]` | Parent_Selected_Layers_To_Layers_Below | layer | Low | Parents each layer to the layer directly below |
| `[x]` | Select_Text_Layers | layer | Low | Selects all text layers in comp |
| `[x]` | Add_Simple_Loop_Expression | property | Medium | loopIn/loopOut with type + numKeyframes params |
| `[x]` | Add_Visibility_Controller | layer | Medium | Null + visibility toggle linked to layers |
| `[x]` | Add_Additional_Animation_Control | property | Medium | Slider/angle control linked to property via expression |
| `[x]` | Fill_In_Keyframes | property | Medium | Generates keyframes between selected keyframes |
| `[x]` | Add_Labeled_Items_To_Render_Queue | render | Low | Batch-queues comps by color label |
| `[x]` | Build_Dropdown_Selector | property | High | Dropdown controller that toggles layer visibility |
| `[x]` | Set_Simple_Time_Remap_Loop | property | Medium | Time remap with loop expression |
| `[x]` | Prepare_Layer_Out_Points_For_Lottie | layer | Low | Adjusts layer timing for Lottie export |
| `[x]` | Toggle_Specific_Effects | layer | Low | Enables/disables named effects on selected layers |
| `[x]` | Add_Markers_At_Selected_Keyframes | marker | Low | Places comp markers at keyframe times |

---

## Full Catalog

### Marker
| Status | Script | Effort | Notes |
|--------|--------|--------|-------|
| `[x]` | Add_Markers_At_Out_Points | Low | |
| `[x]` | Add_Markers_At_Selected_Keyframes | Low | |
| `[x]` | Add_Markers_At_Work_Area | Low | |
| `[x]` | Add_Markers_To_Selected_Layers | Low | |
| `[x]` | Copy_Composition_Markers_To_Layer | Low | |
| `[x]` | Copy_Layer_Markers_To_Composition | Low | |
| `[x]` | Add_Beat_Markers | Low | Already covered (addBeatMarkers) |

### Property / Keyframe
| Status | Script | Effort | Notes |
|--------|--------|--------|-------|
| `[x]` | Add_Additional_Animation_Control | Medium | Slider/angle + expression link |
| `[x]` | Add_Simple_Loop_Expression | Medium | loopIn/loopOut params |
| `[x]` | Add_Posterize_Time_Expression | Low | Applies posterize time expression |
| `[x]` | Append_To_Expression | Low | Appends text to existing expressions |
| `[x]` | Apply_Maintain_Stroke_Width_Expression | Low | |
| `[x]` | Build_Dropdown_Selector | High | Dropdown → layer visibility |
| `[x]` | Disable_Selected_Expressions | Low | |
| `[x]` | Enable_Selected_Expressions | Low | |
| `[x]` | Fill_In_Keyframes | Medium | |
| `[x]` | Flip_Path | Low | Reverses vector path direction |
| `[x]` | Invert_Selected_Keyframes | Low | Multiply by -1 |
| `[x]` | Keyframe_Current_Value_From_Expression | Medium | Bake expression value to keyframe |
| `[x]` | Keyframe_Group_Opacities | Medium | Linked opacity keyframes across layers |
| `[x]` | Make_Hold_Keyframes | Low | |
| `[x]` | Multiply_Selected_Keyframes | Medium | Multiply keyframe values by factor |
| `[x]` | Remove_Redundant_Keyframes | Low | |
| `[x]` | Round_Selected_Keyframe_Values | Low | Rounds to nearest integer |
| `[x]` | Round_Selected_Property_Values | Low | Expression-based |
| `[x]` | Set_Simple_Time_Remap_Loop | Medium | |
| `[x]` | Swap_Property_Values | Low | |
| `[x]` | Swap_Selected_Property_Dimensions | Low | Swap X/Y or R/G/B |
| `[x]` | Toggle_Maintain_Scale_Expression | Low | |
| `[x]` | Update_Stroke_Weight_Expressions | Medium | |

### Layer
| Status | Script | Effort | Notes |
|--------|--------|--------|-------|
| `[x]` | Add_Visibility_Controller | Medium | |
| `[x]` | Connect_Two_Layers_With_A_Line | High | Shape line between two layers |
| `[x]` | Enable_Collapse_Transformations | Low | Enables on all layers |
| `[x]` | Hard_Solo_Layers | Low | Hides all except selected |
| `[x]` | Lock_All_Layers | Low | |
| `[x]` | Parent_Opacity | Low | Links layer opacity to parent opacity |
| `[x]` | Parent_Selected_Layers_To_Layers_Below | Low | |
| `[x]` | Prepare_Layer_Out_Points_For_Lottie | Low | |
| `[x]` | Randomize_Layer_Start_Time | Low | |
| `[x]` | Rename_Selected_Layers_With_Numbers | Low | Sequential numbering |
| `[x]` | Select_All_Children | Low | |
| `[x]` | Select_Disabled_Layers | Low | |
| `[x]` | Select_Guide_Layers | Low | |
| `[x]` | Select_Non-Null_Layers | Low | |
| `[x]` | Select_Parent_Layer | Low | |
| `[x]` | Select_Random_Layers | Low | |
| `[x]` | Select_Shape_Layers | Low | |
| `[x]` | Select_Text_Layers | Low | |
| `[x]` | Select_Unparented_Layers | Low | |
| `[x]` | Set_To_Average_Position | Low | |
| `[x]` | Set_Track_Matte_To_Above | Low | |
| `[x]` | Shift_Layer_Start_Time | Low | |
| `[x]` | Toggle_Specific_Effects | Low | |
| `[x]` | Unlock_All_Layers | Low | |
| `[x]` | Zero_Position | Low | |
| `[-]` | Add_Background_Layer | Low | Covered by addSolid |
| `[-]` | Add_Camera_With_Controller | Medium | Covered by addCameraRig |
| `[-]` | Duplicate_Selected_Layer | Low | AE built-in |

### Effect
| Status | Script | Effort | Notes |
|--------|--------|--------|-------|
| `[x]` | Add_Posterize_Time_Adjustment_Layer | Low | |
| `[-]` | Convert_Drop_Shadows_For_Lottie | High | No upstream source script found in the referenced repo; left skipped pending a source/example to port |
| `[x]` | Enable_Motion_Blur | Low | Enables on all layers |

### Comp
| Status | Script | Effort | Notes |
|--------|--------|--------|-------|
| `[x]` | Add_3D_Break | Low | Adjustment layer separating 3D/2D |
| `[x]` | Center_Composition | Low | Centers all layers |
| `[x]` | Enable_Collapse_Transformations | Low | |
| `[x]` | Increment_Composition_Versions | Low | Version number in comp name |
| `[x]` | Reset_Composition_Work_Area | Low | Resets to full duration |
| `[x]` | Set_Work_Area_To_Markers | Low | Work area to outer markers |
| `[x]` | Toggle_Onion_Skinning | Low | |
| `[x]` | Toggle_Preserve_Nested_Frame_Rate | Low | |
| `[x]` | Toggle_Timecode_And_Start_Frames | Low | |
| `[x]` | Transfer_Composition_Work_Area | Low | Copies work area between comps |
| `[-]` | Add_Composition_Guide | Low | Covered by addGuidePreset |

### Render
| Status | Script | Effort | Notes |
|--------|--------|--------|-------|
| `[x]` | Add_Labeled_Items_To_Render_Queue | Low | Queue by color label |
| `[x]` | Add_Selected_Compositions_To_Render_Queue | Low | |
| `[x]` | Clean_Render_Queue | Low | Remove all items |
| `[-]` | Add_Folder_To_Render_Queue | Medium | Lower priority |

### Utility
| Status | Script | Effort | Notes |
|--------|--------|--------|-------|
| `[x]` | Add_Selection_To_New_Folder | Low | Covered partially by ensureProjectFolder |
| `[x]` | Calculate_Distance_Between_Layers | Low | Returns pixel distance |
| `[x]` | Find_All_Expressions | Low | Lists all expressions in project |
| `[x]` | Find_Specific_Effect | Low | Selects layers with named effect |
| `[x]` | Reset_Layer_Names | Low | Resets to source names |
| `[-]` | Manually_Render_PNG_Sequence | High | File I/O, skip |
| `[-]` | Save_Frame_As_PNG | High | File I/O, skip |
| `[-]` | Export_Text_To_File | High | File I/O, skip |
| `[-]` | Export_Path_Points | High | File I/O, skip |

---

## Conversion Recipe

See **[docs/conversion-recipe.md](conversion-recipe.md)** for the full guide including worked example, common pitfalls, and complete checklist.
