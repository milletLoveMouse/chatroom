import { AudioFilled, AudioMutedOutlined, AudioOutlined } from "@ant-design/icons";
import { Button, Select, Space } from "antd";
import { Icon } from '@ricons/utils'
import { Video48Regular, VideoOff48Regular, Video48Filled } from '@ricons/fluent';
import { DeviceDesktop, DeviceDesktopOff } from '@ricons/tabler'
import { ExitToAppFilled } from '@ricons/material'
import { ChatboxEllipsesOutline } from '@ricons/ionicons5'
import React, { forwardRef, memo, Ref, useEffect, useImperativeHandle, useState } from "react";
import MediaDevices, { DeviceInfo } from "/@/utils/MediaDevices/mediaDevices";
import { onError } from "/@/utils/WebRTC/message";

export interface Emits {
  updateDeviceInfo?: (deviceInfo: Props['deviceInfo']) => void;
  updateJoinDisable?: (joinDisable: boolean) => void;
  onAudioChange?: (deviceId: string) => void;
  onCameraChange?: (deviceId: string) => void;
  onAudioDisabledToggle?: (disable: boolean) => void;
  onCameraDisabledToggle?: (disable: boolean) => void;
  onDispalyEnabledToggle?: (enable: boolean) => void;
  onChatBoxToggle?: (value: boolean) => void;
  onExit?: () => void;
}
export interface Props extends Emits {
  deviceInfo: {
    audioDisabled: boolean;
    cameraDisabled: boolean;
    audioDeviceId: string;
    cameraDeviceId: string;
    dispalyEnabled: boolean;
  };
  state: boolean;
  joinDisable: boolean;
  open: boolean
}

export type RefType = {
  reset: () => void;
  updateDeviceId: (tracks: MediaStreamTrack[]) => void;
}

const DeviceSelect = memo(forwardRef((props: Props, ref: Ref<RefType>) => {
  const fieldNames = { value: 'deviceId' }
  const iconStyle = {
    fontSize: '1.3em'
  }
  // 媒体流列表
  type Options = Array<DeviceInfo>
  let [audioMediaStreamTrackOptions, setAudioMediaStreamTrackOptions] = useState<Options>([])
  let [cameraMediaStreamTrackOptions, setCameraMediaStreamTrackOptions] = useState<Options>([])
  
  let deviceInfo: Props['deviceInfo'] = { ...props.deviceInfo }
  const updataModelValue = (data: Partial<Props['deviceInfo']>) => {
    deviceInfo = { ...deviceInfo, ...data } // update:modelValue异步防抖更新，将修改的数据保存
    props.updateDeviceInfo?.({ ...props.deviceInfo, ...deviceInfo })
  }

  // 麦克风设备切换禁用状态
  const audioDisabledToggle = () => {
    const disabled = !props.deviceInfo.audioDisabled
    audioDisabledChange(disabled)
  }

  function audioDisabledChange(disabled: boolean) {
    updataModelValue({ audioDisabled: disabled })
    props.onAudioDisabledToggle?.(disabled)
  }

  // 摄像头设备切换禁用状态
  const cameraDisabledToggle = () => {
    const disabled = !props.deviceInfo.cameraDisabled
    cameraDisabledChange(disabled)
  }

  function cameraDisabledChange(disabled: boolean) {
    updataModelValue({ cameraDisabled: disabled })
    props.onCameraDisabledToggle?.(disabled)
  }

  // 麦克风设备切换处理事件
  const audioChange = (deviceId: string) => {
    updataModelValue({ audioDeviceId: deviceId })
    props.onAudioChange?.(deviceId)
  }

  // 摄像头设备切换处理事件
  const cameraChange = (deviceId: string) => {
    updataModelValue({ cameraDeviceId: deviceId })
    props.onCameraChange?.(deviceId)
  }

  // 开启/取消共享屏幕
  const dispalyEnabledToggle = () => {
    const enabled = !props.deviceInfo.dispalyEnabled
    updataModelValue({ dispalyEnabled: enabled })
    props.onDispalyEnabledToggle?.(enabled)
  }

  const chatBoxToggle = () => {
    props.onChatBoxToggle?.(!props.open)
  }

  const exit = () => {
    props.onExit?.()
  }

  function reset() {
    props.onChatBoxToggle?.(false)
  }

  function updateDeviceId(tracks: MediaStreamTrack[]) {
    if (tracks.length === 0) {
      audioDisabledChange(false)
      cameraDisabledChange(false)
    } else if (tracks.length === 1) {
      if (tracks[0].kind === 'audio') {
        audioDisabledChange(false)
      } else if (tracks[0].kind === 'video') {
        cameraDisabledChange(false)
      }
    }
    for (const track of tracks) {
      if (track.kind === 'audio'){
        const deviceId = audioMediaStreamTrackOptions.find(input => input.label === track.label)?.deviceId
        updataModelValue({ audioDeviceId: deviceId })
      } else if (track.kind === 'video'){
        const deviceId = cameraMediaStreamTrackOptions.find(input => input.label === track.label)?.deviceId
        updataModelValue({ cameraDeviceId: deviceId })
      }
    }
  }

  const mediaDevices = new MediaDevices({
    audio: true,
    video: true
  })
  async function initDeviceInfo() {
    try {
      const deviceInfoList = await MediaDevices.enumerateDevices()
      const map = new Map<string, DeviceInfo[]>()
      deviceInfoList.forEach((deviceInfo: DeviceInfo) => {
        const list = map.get(deviceInfo.kind) || []
        list.push(deviceInfo)
        map.set(deviceInfo.kind, list)
      })
      audioMediaStreamTrackOptions = map.get('audioinput') as Options
      cameraMediaStreamTrackOptions = map.get('videoinput') as Options
      setAudioMediaStreamTrackOptions(audioMediaStreamTrackOptions)
      setCameraMediaStreamTrackOptions(cameraMediaStreamTrackOptions)
      if (!props.deviceInfo.audioDeviceId || !props.deviceInfo.cameraDeviceId) {
        const tracks = await mediaDevices.getUserMediaStreamTracks()
        updateDeviceId(tracks)
        props.updateJoinDisable?.(false)
      }
    } catch (error) {
      props.updateJoinDisable?.(true)
      onError('以阻止页面访问摄像头或者麦克风，应用将无法正常使用')
      console.error(error.message);
      setTimeout(initDeviceInfo, 1000)
    }
  }

  useImperativeHandle(ref, () => {
    return {
      reset,
      updateDeviceId
    }
  })

  useEffect(() => {
    initDeviceInfo()
  }, [])
  return (
    <div className="device-select" style={{textAlign: 'center'}}>
      <Space>
        <Select
          value={props.deviceInfo.audioDeviceId}
          style={{width: 120}}
          options={audioMediaStreamTrackOptions}
          onChange={audioChange}
          fieldNames={fieldNames}
          disabled={props.deviceInfo.audioDisabled}
          suffixIcon={<AudioFilled style={iconStyle} />}
        >
        </Select>
        &nbsp;
        <Button
          onClick={audioDisabledToggle}
          shape="circle"
          icon={props.deviceInfo.audioDisabled ? <AudioMutedOutlined />: <AudioOutlined />}
        />
        <Select
          value={props.deviceInfo.cameraDeviceId}
          style={{width: 120}}
          options={cameraMediaStreamTrackOptions}
          onChange={cameraChange}
          fieldNames={fieldNames}
          disabled={props.deviceInfo.cameraDisabled}
          suffixIcon={<span className="anticon" style={iconStyle}><Icon><Video48Filled /></Icon></span>}
        >
        </Select>
        &nbsp;
        <Button
          onClick={cameraDisabledToggle}
          shape="circle"
          icon={<span className="anticon" style={iconStyle}><Icon>{props.deviceInfo.cameraDisabled ? <VideoOff48Regular /> : <Video48Regular />}</Icon></span>}
        />
      </Space>
      {props.state ? (
        <span>
          &nbsp;
          <Button
            onClick={dispalyEnabledToggle}
            icon={<span className="anticon" style={iconStyle}><Icon>{props.deviceInfo.dispalyEnabled ? <DeviceDesktopOff /> : <DeviceDesktop />}</Icon></span>}
            type="primary"
          >
            {props.deviceInfo.dispalyEnabled ? '取消共享' : '共享屏幕'}
          </Button>
          &nbsp;
          <Button
            shape="circle"
            type="primary"
            icon={<span className="anticon" style={iconStyle}><Icon><ChatboxEllipsesOutline /></Icon></span>}
            onClick={chatBoxToggle}
            >
          </Button>
          &nbsp;
          <Button 
            onClick={exit}
            icon={<span className="anticon" style={iconStyle}><Icon><ExitToAppFilled /></Icon></span>}
            type="primary"
            danger
          >
            退出房间
          </Button>
        </span>
        
      ): ''}
    </div>
  )
}))

export default DeviceSelect