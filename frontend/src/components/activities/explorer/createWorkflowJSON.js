import { ObjectTypes } from "../../../objectTypes";
import { writeToFileHandle } from "../../../redux/hooks/workingDirectoryHooks";
import workingDirectorySlice from "../../../redux/slices/workingDirectorySlice";

export async function createWorkflowJSON(
    dirName,
    dispatch,
    availableBaseName,
    objectType,
    actualFileName,
    filePath,
    collection,
    initialUpload,
) {
    try {
        const directory = objectType
            ? await dirName.getDirectoryHandle(objectType, { create: true })
            : dirName;
        const jsonFileName = `${availableBaseName}.json`;
        const jsonFileHandle = await directory.getFileHandle(jsonFileName, { create: true });

        const defaultWorkflow = {
            activeStep: 0,
            file: filePath,
            collection: collection || {},
            uploads: initialUpload ? [initialUpload] : [],
        };

        await writeToFileHandle(jsonFileHandle, JSON.stringify(defaultWorkflow));

        const uploadedFileHandle = await directory.getFileHandle(actualFileName, { create: false });
        uploadedFileHandle.id = objectType
            ? `${objectType}/${actualFileName}`
            : actualFileName;
        uploadedFileHandle.id = `${objectType}/${actualFileName}`;
        if (objectType === 'collections') {
            uploadedFileHandle.objectType = ObjectTypes.Collections.id;
        } else if (objectType === 'resources') {
            uploadedFileHandle.objectType = ObjectTypes.Resources.id;
        } else if (objectType === 'devices') {
            uploadedFileHandle.objectType = ObjectTypes.Devices.id;
        } else if (objectType === 'strains') {
            uploadedFileHandle.objectType = ObjectTypes.Strains.id;
        } else if (objectType === 'sampleDesigns') {
            uploadedFileHandle.objectType = ObjectTypes.SampleDesigns.id;
        } else if (objectType === 'plasmids') {
            uploadedFileHandle.objectType = ObjectTypes.Plasmids.id;
        } else if (objectType === 'assays') {
            uploadedFileHandle.objectType = ObjectTypes.Metadata.id;
        } else {
            uploadedFileHandle.objectType = ObjectTypes.Designs.id;
        }
        dispatch(workingDirectorySlice.actions.addFile(uploadedFileHandle));
    } catch (err) {
        console.error("Error creating resource workflow JSON:", err);
    }
}