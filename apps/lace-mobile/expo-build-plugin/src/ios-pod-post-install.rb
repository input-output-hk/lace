# This fragment is injected into the generated Podfile's post_install block.
#
# We keep it as Ruby because CocoaPods evaluates the Podfile directly. The JS
# config plugin is only responsible for inserting this text into the right
# place in the generated file.

# Preserve existing CocoaPods / React Native settings while appending the
# compatibility flags Apollo and RN 0.81 currently need.
NON_MODULAR_INCLUDE_WARNING_FLAG =
  '-Wno-error=non-modular-include-in-framework-module'
NON_MODULAR_INCLUDE_SWIFT_FLAGS =
  ['-Xcc', NON_MODULAR_INCLUDE_WARNING_FLAG].freeze

append_build_setting = lambda do |value, flags, fallback = "$(inherited)"|
  values = case value
  when Array
    value.map(&:to_s)
  when nil
    [fallback]
  else
    [value.to_s]
  end

  requested_flags = Array(flags).map(&:to_s)
  requested_sequence = requested_flags.join(" ")
  current_sequence = values.join(" ")

  # Keep flag pairs like "-Xcc <clang-flag>" atomic when checking duplicates.
  values.concat(requested_flags) unless current_sequence.include?(requested_sequence)
  values
end
installer.pods_project.targets.each do |target|
  target.build_configurations.each do |config|
    # RN 0.81 relies on C++20 features in several pods.
    config.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++20'
    config.build_settings['CLANG_CXX_LIBRARY'] = 'libc++'

    # Apollo and some RN 0.81 pods still need non-modular headers to compile.
    config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
    config.build_settings['OTHER_CFLAGS'] = append_build_setting.call(
      config.build_settings['OTHER_CFLAGS'],
      NON_MODULAR_INCLUDE_WARNING_FLAG
    )
    config.build_settings['OTHER_CPLUSPLUSFLAGS'] = append_build_setting.call(
      config.build_settings['OTHER_CPLUSPLUSFLAGS'],
      NON_MODULAR_INCLUDE_WARNING_FLAG
    )
    config.build_settings['OTHER_SWIFT_FLAGS'] = append_build_setting.call(
      config.build_settings['OTHER_SWIFT_FLAGS'],
      NON_MODULAR_INCLUDE_SWIFT_FLAGS
    )

    # Do not fail Release builds on those known header warnings.
    config.build_settings['GCC_TREAT_WARNINGS_AS_ERRORS'] = 'NO'
  end
end
