import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { tw } from '../../utils/tw';
import { useTheme } from '../../context/ThemeContext';
import { registerPopup } from './popup';

const PopupProvider = ({ children }) => {
  const { isDarkMode } = useTheme();
  const [state, setState] = useState({ visible: false, title: '', message: '', buttons: [] });

  const close = () => {
    setState((s) => ({ ...s, visible: false }));
  };

  const pressButton = (btn) => {
    const onPress = btn && btn.onPress;
    const keepOpen = btn && btn.keepOpen;
    close();
    if (onPress && !keepOpen) {
      // call after the modal has hidden
      setTimeout(() => onPress(), 50);
    }
  };

  useEffect(() => {
    const unregister = registerPopup((opts) => {
      setState({
        visible: true,
        title: opts.title || '',
        message: opts.message || '',
        buttons: Array.isArray(opts.buttons) && opts.buttons.length
          ? opts.buttons
          : [{ text: 'OK', onPress: undefined }],
      });
    });
    return unregister;
  }, []);

  const defaultButtons = [{ text: 'OK', onPress: undefined }];
  const buttons = state.visible && Array.isArray(state.buttons) && state.buttons.length
    ? state.buttons
    : defaultButtons;

  return (
    <>
      {children}
      <Modal
        visible={state.visible}
        transparent
        animationType="fade"
        onRequestClose={close}
      >
        <View style={tw('flex-1 bg-black/70 justify-center items-center px-5')}>
          <View style={tw(`w-full max-w-md rounded-3xl border p-5 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} shadow-2xl`)}>
            {!!state.title && (
              <Text style={tw(`text-[28px] font-bold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`)}>
                {state.title}
              </Text>
            )}
            {!!state.message && (
              <ScrollView
                style={{ maxHeight: 320 }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingRight: 6 }}
              >
                <Text style={tw(`text-[17px] leading-7 ${isDarkMode ? 'text-slate-200' : 'text-gray-800'}`)}>
                  {state.message}
                </Text>
              </ScrollView>
            )}
            <View style={tw('flex-row justify-end mt-6 flex-wrap')}>
              {buttons.map((btn, i) => {
                const btnStyle = btn && btn.style;
                const isCancel = btnStyle === 'cancel';
                const isDestructive = btnStyle === 'destructive';
                const label = (btn && btn.text) || 'OK';
                const buttonTw = isCancel
                  ? `${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`
                  : isDestructive
                    ? 'bg-red-500'
                    : 'bg-green-600';
                const labelTw = isCancel
                  ? `${isDarkMode ? 'text-white' : 'text-gray-800'}`
                  : 'text-white';
                return (
                  <TouchableOpacity
                    key={i}
                    style={tw(`min-w-[110px] px-5 py-3 rounded-xl ml-2 mt-2 ${buttonTw}`)}
                    onPress={() => pressButton(btn)}
                  >
                    <Text style={tw(`text-base font-semibold text-center ${labelTw}`)}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default PopupProvider;
