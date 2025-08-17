import { createStore } from 'solid-js/store';


type DialogDataMap = {
  'updatePrompt': (reloadPage?: undefined) => Promise<void>;
  'actionsMenu': CollectionItem,
  'snackbar': string;
  '': undefined;
};

type DialogState = {
  [K in keyof DialogDataMap]: { activeDialog: K; data: DialogDataMap[K] };
}[keyof DialogDataMap];

const [dialogState, setDialogState] = createStore<DialogState>({
  activeDialog: '',
  data: undefined,
});

function openDialog<T extends keyof DialogDataMap>(
  name: T,
  data: DialogDataMap[T]
): void {
  setDialogState({ activeDialog: name, data: data as any });
}

function closeDialog() {
  setDialogState({ activeDialog: '', data: undefined });
}

export { dialogState, openDialog, closeDialog };
