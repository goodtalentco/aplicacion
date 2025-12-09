/**
 * Componente para prevenir gestos de navegación no deseados del navegador
 * Desactiva swipe izquierda/derecha, botones laterales del mouse, y combinaciones de teclas
 */

'use client'

import { useEffect } from 'react'

export default function NavigationGestureDisabler({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Prevenir navegación con gestos del mouse/trackpad
    const preventNavigation = (e: MouseEvent) => {
      // Prevenir botones laterales del mouse (botón 3 = atrás, botón 4 = adelante)
      if (e.button === 3 || e.button === 4) {
        e.preventDefault()
        e.stopPropagation()
        return false
      }
    }

    // Verificar si un elemento es scrolleable horizontalmente
    const isElementHorizontallyScrollable = (element: Element): boolean => {
      const computedStyle = window.getComputedStyle(element)
      const overflowX = computedStyle.overflowX
      const hasHorizontalScroll = element.scrollWidth > element.clientWidth
      
      // Verificar también clases de Tailwind y atributos especiales
      const className = typeof element.className === 'string' ? element.className : (element.className as any)?.toString() || ''
      const hasScrollClass = className.includes('overflow-x-auto') || 
                            className.includes('overflow-x-scroll') || 
                            className.includes('horizontal-scroll') ||
                            className.includes('table-container')
      
      const hasScrollAttribute = element.hasAttribute('data-scroll-horizontal')
      const isTable = element.tagName === 'TABLE' || element.closest('table') !== null
      
      return (hasHorizontalScroll && (
        overflowX === 'scroll' || 
        overflowX === 'auto' || 
        overflowX === 'overlay'
      )) || hasScrollClass || hasScrollAttribute || (isTable && hasHorizontalScroll)
    }

    // Buscar elemento scrolleable en la cadena de ancestros
    const findScrollableAncestor = (element: Element | null): Element | null => {
      while (element && element !== document.body) {
        if (isElementHorizontallyScrollable(element)) {
          return element
        }
        element = element.parentElement
      }
      return null
    }

    // Prevenir gestos de swipe horizontal solo si no estamos en un elemento scrolleable
    const preventSwipeNavigation = (e: TouchEvent) => {
      // Solo prevenir swipes de dos dedos
      if (e.touches.length === 2) {
        const target = e.target as Element
        const scrollableElement = findScrollableAncestor(target)
        
        // Si hay un elemento scrolleable, permitir el gesto
        if (scrollableElement) {
          return
        }
        
        const touch1 = e.touches[0]
        const touch2 = e.touches[1]
        
        // Solo prevenir si el gesto está cerca de los bordes de la pantalla
        if (touch1.clientX < 50 || touch1.clientX > window.innerWidth - 50 ||
            touch2.clientX < 50 || touch2.clientX > window.innerWidth - 50) {
          e.preventDefault()
        }
      }
    }

    // Prevenir navegación con teclas
    const preventKeyNavigation = (e: KeyboardEvent) => {
      // Prevenir Alt + flecha izquierda/derecha (navegación del navegador)
      if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault()
        e.stopPropagation()
        return false
      }
      
      // Prevenir retroceso si no estamos en un input
      if (e.key === 'Backspace') {
        const target = e.target as HTMLElement
        if (target.tagName !== 'INPUT' && 
            target.tagName !== 'TEXTAREA' && 
            !target.isContentEditable) {
          e.preventDefault()
          return false
        }
      }
    }

    // Prevenir wheel horizontal que puede disparar navegación, pero permitir scroll en elementos
    const preventWheelNavigation = (e: WheelEvent) => {
      // Si es scroll horizontal
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        const target = e.target as Element
        const scrollableElement = findScrollableAncestor(target)
        
        // Si hay un elemento scrolleable, verificar si puede hacer scroll
        if (scrollableElement) {
          const canScrollLeft = scrollableElement.scrollLeft > 0
          const canScrollRight = scrollableElement.scrollLeft < (scrollableElement.scrollWidth - scrollableElement.clientWidth)
          
          // Solo permitir si puede hacer scroll en la dirección del wheel
          if ((e.deltaX < 0 && canScrollLeft) || (e.deltaX > 0 && canScrollRight)) {
            return // Permitir el scroll
          }
        }
        
        // Prevenir navegación del navegador solo si no estamos en elemento scrolleable
        // o si el elemento no puede hacer más scroll en esa dirección
        const scrollLeft = document.documentElement.scrollLeft || document.body.scrollLeft
        const scrollWidth = document.documentElement.scrollWidth || document.body.scrollWidth
        const clientWidth = document.documentElement.clientWidth || window.innerWidth
        
        // Si estamos al límite de la página, prevenir
        if ((scrollLeft <= 0 && e.deltaX < 0) || 
            (scrollLeft + clientWidth >= scrollWidth && e.deltaX > 0)) {
          e.preventDefault()
        }
      }
    }

    // Agregar event listeners con captura para interceptar antes que otros handlers
    document.addEventListener('mousedown', preventNavigation, true)
    document.addEventListener('mouseup', preventNavigation, true)
    document.addEventListener('touchstart', preventSwipeNavigation, { passive: false })
    document.addEventListener('touchmove', preventSwipeNavigation, { passive: false })
    document.addEventListener('keydown', preventKeyNavigation, true)
    document.addEventListener('wheel', preventWheelNavigation, { passive: false })

    // También prevenir el evento popstate que puede ser disparado por gestos
    const preventPopstate = (e: PopStateEvent) => {
      // Solo prevenir si no hay un hash en la URL (navegación legítima)
      if (!window.location.hash) {
        e.preventDefault()
        e.stopPropagation()
        // Restaurar la URL actual
        window.history.pushState(null, '', window.location.href)
        return false
      }
    }

    window.addEventListener('popstate', preventPopstate)

    // Agregar CSS para prevenir overscroll behavior solo en el body, no en elementos internos
    const style = document.createElement('style')
    style.textContent = `
      html, body {
        overscroll-behavior-x: none;
        overscroll-behavior-y: auto;
      }
      
      /* Permitir scroll horizontal en elementos específicos */
      .overflow-x-auto,
      .overflow-x-scroll,
      [data-scroll-horizontal="true"],
      table,
      .table-container,
      .horizontal-scroll {
        overscroll-behavior-x: auto !important;
      }
    `
    document.head.appendChild(style)

    // Cleanup
    return () => {
      document.removeEventListener('mousedown', preventNavigation, true)
      document.removeEventListener('mouseup', preventNavigation, true)
      document.removeEventListener('touchstart', preventSwipeNavigation)
      document.removeEventListener('touchmove', preventSwipeNavigation)
      document.removeEventListener('keydown', preventKeyNavigation, true)
      document.removeEventListener('wheel', preventWheelNavigation)
      window.removeEventListener('popstate', preventPopstate)
      
      // Remover estilo
      if (style.parentNode) {
        style.parentNode.removeChild(style)
      }
    }
  }, [])

  return <>{children}</>
}
